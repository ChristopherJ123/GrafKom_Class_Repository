function main() {
    // --- 1. INITIAL SETUP ---
    // Get the HTML canvas element from the page. This is our drawing surface.
    var CANVAS = document.getElementById("myCanvas");

    // Set the canvas to fill the entire browser window.
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;


    // --- 2. CURVE GENERATION LOGIC (The "Math" part) ---
    // These functions don't draw anything; they just calculate a list of (x, y) points.

    /**
     * Generates points for a B-Spline curve.
     * B-Splines are complex, smooth curves great for modeling.
     * @param {number[]} controlPoint - An array of control points [x1, y1, x2, y2, ...].
     * @param {number} m - The number of points to generate for the curve's segments.
     * @param {number} degree - The degree of the curve (e.g., 2 for quadratic).
     * @returns {number[]} A flat array of vertex coordinates [x1, y1, x2, y2, ...].
     */
    function generateBSpline(controlPoint, m, degree) {
        var curves = [];
        var knotVector = []

        var n = controlPoint.length / 2;

        // Calculate the knot vector, which controls how the control points influence the curve.
        for (var i = 0; i < n + degree + 1; i++) {
            if (i < degree + 1) {
                knotVector.push(0);
            } else if (i >= n) {
                knotVector.push(n - degree);
            } else {
                knotVector.push(i - degree);
            }
        }

        // The Cox-de Boor recursion formula to calculate the basis functions. This is the core of B-Spline math.
        var basisFunc = function (i, j, t) {
            if (j == 0) {
                if (knotVector[i] <= t && t < (knotVector[(i + 1)])) {
                    return 1;
                } else {
                    return 0;
                }
            }
            var den1 = knotVector[i + j] - knotVector[i];
            var den2 = knotVector[i + j + 1] - knotVector[i + 1];
            var term1 = 0;
            var term2 = 0;
            if (den1 != 0 && !isNaN(den1)) {
                term1 = ((t - knotVector[i]) / den1) * basisFunc(i, j - 1, t);
            }
            if (den2 != 0 && !isNaN(den2)) {
                term2 = ((knotVector[i + j + 1] - t) / den2) * basisFunc(i + 1, j - 1, t);
            }
            return term1 + term2;
        }

        // Loop through to generate each point on the final curve.
        for (var t = 0; t < m; t++) {
            var x = 0;
            var y = 0;
            var u = (t / m * (knotVector[controlPoint.length / 2] - knotVector[degree])) + knotVector[degree];
            // Sum up the influence of each control point to get the final (x, y) coordinate.
            for (var key = 0; key < n; key++) {
                var C = basisFunc(key, degree, u);
                x += (controlPoint[key * 2] * C);
                y += (controlPoint[key * 2 + 1] * C);
            }
            curves.push(x);
            curves.push(y);
        }
        return curves;
    }

    /**
     * Generates points for a Cubic Bézier curve.
     * Defined by 4 points: start, end, and two "handle" points that pull the curve.
     * @param {number[]} controlPoints - An array of 8 numbers for the 4 control points [p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y].
     * @param {number} numSegments - How many line segments to use to approximate the curve. More segments = smoother curve.
     * @returns {number[]} A flat array of vertex coordinates [x1, y1, x2, y2, ...].
     */
    function generateCubicBezier(controlPoints, numSegments) {
        var curvePoints = [];

        // Assign control points for readability
        var p0x = controlPoints[0], p0y = controlPoints[1];
        var p1x = controlPoints[2], p1y = controlPoints[3];
        var p2x = controlPoints[4], p2y = controlPoints[5];
        var p3x = controlPoints[6], p3y = controlPoints[7];

        // Loop from 0 to 1 to trace the curve
        for (var i = 0; i <= numSegments; i++) {
            var t = i / numSegments; // t is the parameter that goes from 0 (start of curve) to 1 (end of curve).

            // This is the Cubic Bézier formula: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
            var c0 = Math.pow(1 - t, 3);
            var c1 = 3 * Math.pow(1 - t, 2) * t;
            var c2 = 3 * (1 - t) * Math.pow(t, 2);
            var c3 = Math.pow(t, 3);

            // Calculate the x and y coordinates for the point at value 't'.
            var x = c0 * p0x + c1 * p1x + c2 * p2x + c3 * p3x;
            var y = c0 * p0y + c1 * p1y + c2 * p2y + c3 * p3y;

            curvePoints.push(x, y);
        }
        return curvePoints;
    }


    // --- 3. WEBGL INITIALIZATION (The "Boilerplate" part) ---

    // Get the WebGL rendering context from the canvas. This is our interface to the GPU.
    /** @type {WebGLRenderingContext} */
    var GL;
    try {
        GL = CANVAS.getContext("webgl", { antialias: true });
    } catch (e) {
        alert("WebGL context cannot be initialized");
        return false;
    }

    // -- SHADERS --
    // Shaders are small programs that run on the GPU.

    // VERTEX SHADER: Its job is to calculate the final position of each vertex (point).
    var shader_vertex_source = `
        attribute vec2 position; // Input: The (x, y) position of a vertex.
 
        void main(void) {
            // Output: Set the final position of the vertex on the screen.
            gl_Position = vec4(position, 0., 1.);
        }`;

    // FRAGMENT SHADER: Its job is to calculate the final color of each pixel.
    var shader_fragment_source = `
        precision mediump float; // Sets the precision for floating point numbers.
        uniform vec3 uColor;     // Input: A color value that's the same for all pixels in this draw call.
        void main(void) {
            // Output: Set the final color of the pixel.
            gl_FragColor = vec4(uColor, 1.); // Use the input color, with full alpha (opacity).
        }`;


    // -- SHADER COMPILATION AND LINKING --
    // This section takes the shader code (text) and prepares it for the GPU.
    var compile_shader = function (source, type, typeString) {
        var shader = GL.createShader(type);
        GL.shaderSource(shader, source);
        GL.compileShader(shader);
        if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
            alert("ERROR IN " + typeString + " SHADER: " + GL.getShaderInfoLog(shader));
            return false;
        }
        return shader;
    };
    var shader_vertex = compile_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");
    var shader_fragment = compile_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");

    // Create a "shader program" by linking the vertex and fragment shaders together.
    var SHADER_PROGRAM = GL.createProgram();
    GL.attachShader(SHADER_PROGRAM, shader_vertex);
    GL.attachShader(SHADER_PROGRAM, shader_fragment);
    GL.linkProgram(SHADER_PROGRAM);

    // -- CONNECTING JAVASCRIPT TO SHADERS --
    // Get the memory location of the shader's input variables.
    var _position = GL.getAttribLocation(SHADER_PROGRAM, "position"); // For the vertex position attribute.
    var uniform_color = GL.getUniformLocation(SHADER_PROGRAM, "uColor");   // For the color uniform.

    // Enable the position attribute.
    GL.enableVertexAttribArray(_position);

    // Tell WebGL to use the shader program we just created.
    GL.useProgram(SHADER_PROGRAM);


    // --- 4. DATA PREPARATION ---
    // Define the control points for our curves in [-1, 1] coordinate space.
    var bSpline_controlPoint = [
        -1.0, -1.0, -1.0, 1.0,
        1.0, 1.0, 1.0, -1.0
    ];

    var bezier_controlPoints = [
        -0.8, -0.8, // P0 (Start point)
        -0.5, 0.8,  // P1 (First handle)
        0.5, 0.8,   // P2 (Second handle)
        0.8, -0.8   // P3 (End point)
    ];

    // Call our generator functions to get the actual vertex data.
    var bSpline_vertex = generateBSpline(bSpline_controlPoint, 100, 2); // Generate B-Spline with 100 segments
    var curve_vertex = generateCubicBezier(bezier_controlPoints, 100);   // Generate Bézier with 100 segments


    // -- BUFFERS --
    // Buffers are memory chunks on the GPU. We need to send our vertex data there.

    // Create a buffer for the B-Spline data.
    var SPLINE_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, SPLINE_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(bSpline_vertex), GL.STATIC_DRAW);

    // Create a buffer for the Bézier curve data.
    var CURVE_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, CURVE_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(curve_vertex), GL.STATIC_DRAW);


    // --- 5. THE RENDER LOOP ---
    // This `animate` function is called repeatedly to draw each frame.
    GL.clearColor(0.0, 0.0, 0.0, 1.0); // Set the background color to black.

    var animate = function () {
        // Prepare the canvas for drawing.
        GL.viewport(0, 0, CANVAS.width, CANVAS.height); // Set the drawing area to the canvas size.
        GL.clear(GL.COLOR_BUFFER_BIT); // Clear the screen with the background color.

        // --- DRAW THE BÉZIER CURVE ---
        // 1. Tell WebGL which buffer data to use.
        GL.bindBuffer(GL.ARRAY_BUFFER, CURVE_VERTEX);

        // 2. Tell WebGL how the data in the buffer is structured.
        // It should read the `position` attribute from this buffer.
        // - 2 components (x, y)
        // - type FLOAT
        // - don't normalize
        // - stride: 8 bytes (2 floats * 4 bytes/float) to get to the next vertex
        // - offset: 0 bytes (start at the beginning of the buffer)
        GL.vertexAttribPointer(_position, 2, GL.FLOAT, false, 4 * 2, 0);

        // 3. Set the color for this drawing operation (a uniform).
        GL.uniform3f(uniform_color, 1, 0, 0); // Red color (R=1, G=0, B=0)

        // 4. Draw!
        // - Use the LINE_STRIP primitive (connect the dots).
        // - Start at index 0.
        // - Draw a total of `curve_vertex.length / 2` vertices.
        GL.drawArrays(GL.LINE_STRIP, 0, curve_vertex.length / 2);

        // --- DRAW THE B-SPLINE CURVE (Missing Code) ---
        // To draw the b-spline, you would add similar code here, like this:
        /*
        GL.bindBuffer(GL.ARRAY_BUFFER, SPLINE_VERTEX);
        GL.vertexAttribPointer(_position, 2, GL.FLOAT, false, 4 * 2, 0);
        GL.uniform3f(uniform_color, 0, 1, 0); // Set color to Green
        GL.drawArrays(GL.LINE_STRIP, 0, bSpline_vertex.length / 2);
        */

        // Finalize the drawing commands.
        GL.flush();
        // Request the browser to call `animate` again for the next frame.
        window.requestAnimationFrame(animate);
    };
    // Start the animation loop.
    animate();
}
// Run the main function once the webpage has finished loading.
window.addEventListener('load', main);