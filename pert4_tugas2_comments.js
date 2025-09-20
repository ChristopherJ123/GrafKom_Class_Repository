function main() {
    // --- CANVAS AND WEBGL CONTEXT SETUP ---

    // Get the canvas element from the HTML document by its ID.
    var CANVAS = document.getElementById("myCanvas");

    // Set the canvas dimensions to match the browser window's size.
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    // --- MOUSE AND KEYBOARD EVENT HANDLING ---

    var drag = false; // Flag to check if the mouse is being dragged.
    var x_prev, y_prev; // Stores the previous mouse coordinates.
    var dX = 0, dY = 0; // Stores the change in rotation angles.
    var THETA = 0, PHI = 0; // Rotation angles for the sphere.
    var FRICTION = 0.15; // Damping factor to slow down rotation when not dragging.
    var SPEED = 0.05; // Rotation speed when using keyboard controls.

    // Function to handle the 'mousedown' event.
    var mouseDown = function (e) {
        drag = true;
        y_prev = e.pageY, x_prev = e.pageX; // Store the initial mouse position.
        e.preventDefault(); // Prevent default browser action (e.g., text selection).
        return false;
    };

    // Function to handle the 'mouseup' event.
    var mouseUp = function (e) {
        drag = false; // Stop dragging when the mouse button is released.
    };

    // Function to handle the 'mousemove' event.
    var mouseMove = function (e) {
        if (!drag) return false; // Only run if the mouse is being dragged.
        // Calculate the change in mouse position and convert it to rotation angles.
        dX = (e.pageX - x_prev) * 2 * Math.PI / CANVAS.width;
        dY = (e.pageY - y_prev) * 2 * Math.PI / CANVAS.height;
        THETA += dX; // Update the horizontal rotation angle.
        PHI += dY;   // Update the vertical rotation angle.
        x_prev = e.pageX, y_prev = e.pageY; // Store the new mouse position.
        e.preventDefault();
    };

    // Add the mouse event listeners to the canvas.
    CANVAS.addEventListener("mousedown", mouseDown, false);
    CANVAS.addEventListener("mouseup", mouseUp, false);
    CANVAS.addEventListener("mouseout", mouseUp, false); // Also stop dragging if the mouse leaves the canvas.
    CANVAS.addEventListener("mousemove", mouseMove, false);

    // Function to handle keyboard input for rotation.
    var keyDown = function (e) {
        if (e.key === 'w') { // Rotate up
            dY -= SPEED;
        }
        else if (e.key === 'a') { // Rotate left
            dX -= SPEED;
        }
        else if (e.key === 's') { // Rotate down
            dY += SPEED;
        }
        else if (e.key === 'd') { // Rotate right
            dX += SPEED;
        }
    }
    // Add the keydown event listener to the window.
    window.addEventListener("keydown", keyDown, false);


    // Initialize the WebGL rendering context.
    /** @type {WebGLRenderingContext} */
    var GL;
    try {
        // Get the WebGL context from the canvas, with antialiasing enabled.
        GL = CANVAS.getContext("webgl", { antialias: true });
    } catch (e) {
        alert("WebGL context cannot be initialized");
        return false;
    }

    // --- SHADERS ---

    // Vertex Shader: This program runs for each vertex. It calculates the final position
    // of the vertex in clip space and passes its color to the fragment shader.
    var shader_vertex_source = `
        attribute vec3 position; // Input: vertex position (x, y, z)
        attribute vec3 color;    // Input: vertex color (r, g, b)

        uniform mat4 Pmatrix;    // Uniform: Projection matrix (camera lens)
        uniform mat4 Vmatrix;    // Uniform: View matrix (camera position)
        uniform mat4 Mmatrix;    // Uniform: Model matrix (object position/rotation)
        
        varying vec3 vColor;     // Output: color passed to the fragment shader
       
        void main(void) {
            // Calculate the final position of the vertex by multiplying it with the matrices.
            // The order is important: Model -> View -> Projection.
            gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.);
            vColor = color; // Pass the color to the fragment shader.
        }`;

    // Fragment Shader: This program runs for each pixel (fragment). It determines the
    // final color of the pixel.
    var shader_fragment_source = `
        precision mediump float; // Set the precision for floating-point numbers.
        varying vec3 vColor;     // Input: color received from the vertex shader (interpolated).
       
        void main(void) {
            // Set the final color of the fragment.
            gl_FragColor = vec4(vColor, 1.); // Use the interpolated color and set alpha to 1.0 (opaque).
        }`;


    // --- SHADER COMPILATION AND PROGRAM LINKING ---

    // A helper function to compile a shader from its source code.
    var compile_shader = function (source, type, typeString) {
        var shader = GL.createShader(type); // Create a new shader object.
        GL.shaderSource(shader, source);    // Provide the source code.
        GL.compileShader(shader);           // Compile the shader.
        // Check for compilation errors.
        if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
            alert("ERROR IN " + typeString + " SHADER: " + GL.getShaderInfoLog(shader));
            return false;
        }
        return shader;
    };

    // Compile the vertex and fragment shaders.
    var shader_vertex = compile_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");
    var shader_fragment = compile_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");

    // Create the main shader program.
    var SHADER_PROGRAM = GL.createProgram();
    // Attach the compiled shaders to the program.
    GL.attachShader(SHADER_PROGRAM, shader_vertex);
    GL.attachShader(SHADER_PROGRAM, shader_fragment);

    // Link the shaders into a complete program.
    GL.linkProgram(SHADER_PROGRAM);

    // --- GETTING SHADER ATTRIBUTE AND UNIFORM LOCATIONS ---

    // Get the memory location of the 'position' attribute from the shader program.
    var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
    // Enable this attribute to be used.
    GL.enableVertexAttribArray(_position);

    // Get the memory location of the 'color' attribute.
    var _color = GL.getAttribLocation(SHADER_PROGRAM, "color");
    // Enable this attribute.
    GL.enableVertexAttribArray(_color);

    // Get the memory locations of the uniform matrices.
    var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
    var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");

    // Tell WebGL to use the shader program we just created.
    GL.useProgram(SHADER_PROGRAM);

    // --- GEOMETRY GENERATION (SPHERE) ---

    // Function to generate vertices and faces for a sphere (or ellipsoid).
    // a, b, c are the radii along the x, y, z axes.
    // stack and step control the level of detail (number of subdivisions).
    function generateSphere(a, b, c, stack, step) {
        var vertices = []; // Will store vertex data [x,y,z, r,g,b, x,y,z, r,g,b, ...]
        var faces = [];    // Will store indices to form triangles [i1,i2,i3, i4,i5,i6, ...]

        // Loop through vertical stacks (latitude).
        for (var i = 0; i <= stack; i++) {
            // Loop through horizontal steps (longitude).
            for (var j = 0; j <= step; j++) {
                // Parametric equations for a sphere.
                var u = i / stack * Math.PI - (Math.PI / 2); // Angle from -PI/2 to PI/2
                var v = j / step * 2 * Math.PI - Math.PI;    // Angle from -PI to PI

                // Calculate the (x, y, z) coordinates of the vertex.
                var x = a * Math.cos(v) * Math.cos(u);
                var y = b * Math.sin(u);
                var z = c * Math.sin(v) * Math.cos(u);

                // Push the vertex position to the vertices array.
                vertices.push(x, y, z);
                // Calculate and push a color based on the vertex position.
                // This maps the [-1, 1] coordinate range to the [0, 1] color range.
                vertices.push(...[x, y, z].map(val => val / 2 + 0.5));
            }
        }

        // Loop through the grid of vertices to create faces (triangles).
        for (var i = 0; i < stack; i++) { // Note: loop goes to stack-1
            for (var j = 0; j < step; j++) { // Note: loop goes to step-1
                // Get indices of the 4 vertices forming a quad.
                var p1 = i * (step + 1) + j;
                var p2 = p1 + 1;
                var p3 = p1 + (step + 1);
                var p4 = p3 + 1;
                // Create two triangles from the quad.
                faces.push(p1, p2, p4); // Triangle 1
                faces.push(p1, p4, p3); // Triangle 2
            }
        }
        return { vertices, faces };
    }

    // Generate the sphere geometry with a radius of 1 and 100x100 subdivisions.
    var sphere = generateSphere(1, 1, 1, 100, 100);
    var sphere_vertex = sphere.vertices;
    var sphere_faces = sphere.faces;

    // --- BUFFERS (SENDING GEOMETRY TO GPU) ---

    // Create a Vertex Buffer Object (VBO) to store vertex data on the GPU.
    var SPHERE_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, SPHERE_VERTEX); // "Activate" the buffer.
    GL.bufferData(GL.ARRAY_BUFFER,
        new Float32Array(sphere_vertex), // Pass the vertex data as a Float32 array.
        GL.STATIC_DRAW); // Hint that the data will not change often.

    // Create an Element Buffer Object (EBO) or Index Buffer to store face indices.
    var SPHERE_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, SPHERE_FACES); // "Activate" the buffer.
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(sphere_faces), // Pass face data as an unsigned short integer array.
        GL.STATIC_DRAW);

    // --- MATRICES AND CAMERA SETUP ---
    // (This code assumes an external library 'LIBS' for matrix math)

    // Create the projection matrix (defines the camera's field of view).
    var PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    // Create the model matrix (initially an identity matrix, meaning no transformation).
    var MOVEMATRIX = LIBS.get_I4();
    // Create the view matrix (initially an identity matrix).
    var VIEWMATRIX = LIBS.get_I4();

    // Move the camera 6 units back from the origin so we can see the sphere.
    LIBS.translateZ(VIEWMATRIX, -6);


    // --- WEBGL STATE AND RENDER LOOP ---

    // Enable depth testing to correctly render 3D objects without visual artifacts.
    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);

    // Set the color to use when clearing the canvas. (Black in this case).
    GL.clearColor(0.0, 0.0, 0.0, 0.0);
    GL.clearDepth(1.0); // Set the default depth value.

    var time_prev = 0; // Stores the timestamp of the previous frame.

    // The main animation loop, called for every frame.
    var animate = function (time) {
        // Set the viewport to match the canvas size.
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        // Clear the color and depth buffers from the previous frame.
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

        // Calculate delta time (time elapsed since the last frame). Not used here but good practice.
        var dt = time - time_prev;
        time_prev = time;

        // If not dragging the mouse, apply friction to slow down the rotation.
        if (!drag) {
            dX *= (1 - FRICTION);
            dY *= (1 - FRICTION);
            THETA += dX;
            PHI += dY;
        }

        // --- UPDATE MODEL MATRIX AND SEND UNIFORMS ---

        // Reset the model matrix to identity for this frame.
        LIBS.set_I4(MOVEMATRIX);
        // Apply the rotations based on the current THETA (Y-axis) and PHI (X-axis) angles.
        LIBS.rotateY(MOVEMATRIX, THETA);
        LIBS.rotateX(MOVEMATRIX, PHI);

        // Send the updated matrices to the corresponding uniforms in the vertex shader.
        GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);
        GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX);

        // --- DRAW THE SPHERE ---

        // Bind the sphere's vertex buffer.
        GL.bindBuffer(GL.ARRAY_BUFFER, SPHERE_VERTEX);

        // Tell WebGL how to read the position data from the buffer.
        // It starts at offset 0, each position has 3 components (FLOAT),
        // and the total stride for one vertex (pos+color) is 6 floats (24 bytes).
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * (3 + 3), 0);

        // Tell WebGL how to read the color data from the buffer.
        // It starts after the position data (offset 12 bytes), has 3 components,
        // and the stride is the same.
        GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * (3 + 3), 3 * 4);

        // Bind the sphere's face (index) buffer.
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, SPHERE_FACES);

        // Draw the sphere using the indices from the EBO.
        GL.drawElements(GL.TRIANGLES, sphere_faces.length, GL.UNSIGNED_SHORT, 0);

        // Ensure all WebGL commands are executed.
        GL.flush();

        // Request the browser to call 'animate' again for the next frame.
        window.requestAnimationFrame(animate);
    };

    // Start the animation loop.
    animate(0);
}

// Add an event listener to call the main function once the webpage has fully loaded.
window.addEventListener('load', main);