function f(x) {
    return x ** 2; // or Math.pow(x, 2)
}

function main() {
    var CANVAS = document.getElementById("myCanvas");
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    // init WebGL
    var GL;
    try {
        GL = CANVAS.getContext("webgl", { antialias: true });
    } catch (error) {
        alert("WebGL gagal di init");
        return false;
    }

    var shader_vertex_source = `
            attribute vec2 position;
            attribute vec3 color;
            varying vec3 vColor;
            
            void main(void) {
                gl_Position = vec4(position, 0., 1.);
                vColor = color;
            }
            `;

    var shader_fragment_source = `
            precision mediump float;
            varying vec3 vColor;
            
            void main(void) {
                gl_FragColor = vec4(vColor, 1.);
            }
            `;

    var compiler_shader = function (source, type, typeString) {
        var shader = GL.createShader(type);
        GL.shaderSource(shader, source);
        GL.compileShader(shader);
        if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
            alert("ERROR: " + typeString + " SHADER: " + GL.getShaderInfoLog(shader));
            return false;
        }
        return shader;
    };

    var shader_vertex =
        compiler_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");

    var shader_fragment =
        compiler_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");

    // Aktifkan shader openGL
    var SHADER_PROGRAM = GL.createProgram();
    GL.attachShader(SHADER_PROGRAM, shader_vertex);
    GL.attachShader(SHADER_PROGRAM, shader_fragment);

    GL.linkProgram(SHADER_PROGRAM);

    var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
    GL.enableVertexAttribArray(_position);

    var _color = GL.getAttribLocation(SHADER_PROGRAM, "color");
    GL.enableVertexAttribArray(_color);

    GL.useProgram(SHADER_PROGRAM);

    var curve_vertices = [];

    // Generate the vertices for the curve
    let numPoints = 10; // Number of points to define the curve
    for (let i = 0; i <= numPoints; i++) {
        let x_norm = i / numPoints; // x goes from 0.0 to 1.0
        let y_norm = f(x_norm);     // y is calculated from the function

        // Convert normalized coordinates [0, 1] to WebGL clip space [-1, 1]
        let x_clip = x_norm * 2 - 1;
        let y_clip = y_norm * 2 - 1;

        curve_vertices.push(x_clip, y_clip); // Position (x, y)

        // FIX 2: Set a visible color. Let's use yellow (R=1, G=1, B=0).
        curve_vertices.push(1.0, 1.0, 0.0); // Color (R, G, B)
    }

    var CURVE_VBO = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, CURVE_VBO);
    GL.bufferData(GL.ARRAY_BUFFER,
        new Float32Array(curve_vertices),
        GL.STATIC_DRAW
    );

    // CHANGE: Since we are using GL.LINE_STRIP, we don't need an Element Array Buffer (EBO)
    // or the `triangle_faces` array. This simplifies the code.

    GL.clearColor(0.0, 0.0, 0.0, 1.0); // Set clear color to black

    var animate = function () {
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT);

        GL.bindBuffer(GL.ARRAY_BUFFER, CURVE_VBO);

        // Set up the position attribute pointer
        // Stride is 5 * 4 bytes (2 for pos, 3 for color)
        GL.vertexAttribPointer(_position, 2, GL.FLOAT, false, 5 * 4, 0);

        // Set up the color attribute pointer
        // Stride is 5 * 4 bytes, offset is 2 * 4 bytes (after the position data)
        GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 5 * 4, 2 * 4);

        // CHANGE: Use drawArrays with GL.LINE_STRIP to draw the curve.
        // The number of vertices is the total array length divided by the number of components per vertex (5).
        var vertexCount = curve_vertices.length / 5;
        GL.drawArrays(GL.LINE_STRIP, 0, vertexCount);

        GL.flush();
        window.requestAnimationFrame(animate);
    }
    animate();
}

window.addEventListener('load', main)