// Run the main function when the window is fully loaded
window.addEventListener('load', function() {

    // --- 1. SETUP AND INITIALIZATION ---

    const canvas = document.getElementById('gl-canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    /** @type {WebGLRenderingContext} */
    const gl = canvas.getContext('webgl', { antialias: true });

    if (!gl) {
        alert('WebGL is not supported by your browser.');
        return;
    }

    // --- 2. SHADERS (GLSL CODE) ---

    // The Vertex Shader is responsible for positioning each vertex
    const vertexShaderSource = `
        precision mediump float;

        attribute vec3 a_position;
        attribute vec3 a_color;

        uniform mat4 u_modelMatrix;
        uniform mat4 u_viewMatrix;
        uniform mat4 u_projectionMatrix;
        
        varying vec3 v_color;

        void main() {
            gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position, 1.0);
            v_color = a_color;
        }
    `;

    // The Fragment Shader is responsible for coloring each pixel
    const fragmentShaderSource = `
        precision mediump float;

        varying vec3 v_color;

        void main() {
            gl_FragColor = vec4(v_color, 1.0);
        }
    `;

    // --- 3. SHADER COMPILATION AND PROGRAM LINKING ---

    // A helper function to compile a shader
    function compileShader(source, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(`Error compiling shader: ${gl.getShaderInfoLog(shader)}`);
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    // A helper function to create the WebGL program
    function createProgram(vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(`Error linking program: ${gl.getProgramInfoLog(program)}`);
            gl.deleteProgram(program);
            return null;
        }
        return program;
    }

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    const program = createProgram(vertexShader, fragmentShader);

    // Get the memory locations of shader attributes and uniforms
    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    const colorAttributeLocation = gl.getAttribLocation(program, "a_color");

    const modelMatrixUniformLocation = gl.getUniformLocation(program, "u_modelMatrix");
    const viewMatrixUniformLocation = gl.getUniformLocation(program, "u_viewMatrix");
    const projectionMatrixUniformLocation = gl.getUniformLocation(program, "u_projectionMatrix");


    // --- 4. A SIMPLE MATRIX LIBRARY ---
    // This replaces libs.js for this example
    const Mat4 = {
        create: () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],

        perspective: (fieldOfView, aspect, near, far) => {
            const f = 1.0 / Math.tan(fieldOfView / 2);
            const rangeInv = 1 / (near - far);
            return [
                f / aspect, 0, 0, 0,
                0, f, 0, 0,
                0, 0, (near + far) * rangeInv, -1,
                0, 0, near * far * rangeInv * 2, 0
            ];
        },

        translate: (m, tx, ty, tz) => {
            const out = [...m];
            out[12] = m[0]*tx + m[4]*ty + m[8]*tz + m[12];
            out[13] = m[1]*tx + m[5]*ty + m[9]*tz + m[13];
            out[14] = m[2]*tx + m[6]*ty + m[10]*tz + m[14];
            out[15] = m[3]*tx + m[7]*ty + m[11]*tz + m[15];
            return out;
        },

        rotateY: (m, angle) => {
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            const out = [...m];
            const a00 = m[0], a02 = m[2], a10 = m[4], a12 = m[6], a20 = m[8], a22 = m[10];
            out[0] = a00 * c - a02 * s;
            out[2] = a00 * s + a02 * c;
            out[4] = a10 * c - a12 * s;
            out[6] = a10 * s + a12 * c;
            out[8] = a20 * c - a22 * s;
            out[10] = a20 * s + a22 * c;
            return out;
        },

        multiply: (a, b) => {
            let out = [];
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    let sum = 0;
                    for (let k = 0; k < 4; k++) {
                        sum += a[i*4 + k] * b[k*4 + j];
                    }
                    out[i*4 + j] = sum;
                }
            }
            return out;
        }
    };

    // --- 5. GEOMETRY GENERATION ---

    function createSphere(radius, subdivisions, color) {
        const vertices = [];
        const indices = [];

        for (let i = 0; i <= subdivisions; i++) {
            const latAngle = Math.PI * (-0.5 + i / subdivisions);
            const sinLat = Math.sin(latAngle);
            const cosLat = Math.cos(latAngle);

            for (let j = 0; j <= subdivisions; j++) {
                const lonAngle = 2 * Math.PI * (j / subdivisions);
                const sinLon = Math.sin(lonAngle);
                const cosLon = Math.cos(lonAngle);

                const x = cosLon * cosLat;
                const y = sinLat;
                const z = sinLon * cosLat;

                vertices.push(radius * x, radius * y, radius * z);
                vertices.push(color[0], color[1], color[2]);
            }
        }

        for (let i = 0; i < subdivisions; i++) {
            for (let j = 0; j < subdivisions; j++) {
                const first = (i * (subdivisions + 1)) + j;
                const second = first + subdivisions + 1;
                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }
        return { vertices, indices };
    }

    // --- 6. CREATE PIPLUP OBJECTS ---

    // Helper function to create buffers for a piece of geometry
    function createObjectBuffers(geometry) {
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.vertices), gl.STATIC_DRAW);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.STATIC_DRAW);

        return {
            vertexBuffer,
            indexBuffer,
            indexCount: geometry.indices.length
        };
    }

    // Piplup Colors
    const COLOR_BODY = [0.52, 0.80, 1.00];
    const COLOR_HEAD = [0.20, 0.38, 0.64];
    const COLOR_BEAK = [1.00, 0.84, 0.00];
    const COLOR_EYE_WHITE = [1.00, 1.00, 1.00];
    const COLOR_EYE_PUPIL = [0.00, 0.00, 0.00];
    const COLOR_FEET = [1.00, 0.65, 0.00];

    // Create the geometry and buffers for each part
    const piplupParts = [
        { name: "body",       geom: createSphere(1.0, 20, COLOR_BODY),       transform: Mat4.create() },
        { name: "head",       geom: createSphere(0.8, 20, COLOR_HEAD),       transform: Mat4.translate(Mat4.create(), 0, 1.5, 0) },
        { name: "eye_l",      geom: createSphere(0.2, 10, COLOR_EYE_WHITE),  transform: Mat4.translate(Mat4.create(), -0.3, 1.6, 0.7) },
        { name: "eye_r",      geom: createSphere(0.2, 10, COLOR_EYE_WHITE),  transform: Mat4.translate(Mat4.create(), 0.3, 1.6, 0.7) },
        { name: "pupil_l",    geom: createSphere(0.1, 10, COLOR_EYE_PUPIL),  transform: Mat4.translate(Mat4.create(), -0.3, 1.6, 0.8) },
        { name: "pupil_r",    geom: createSphere(0.1, 10, COLOR_EYE_PUPIL),  transform: Mat4.translate(Mat4.create(), 0.3, 1.6, 0.8) },
        { name: "beak_upper", geom: createSphere(0.25, 10, COLOR_BEAK),      transform: Mat4.translate(Mat4.create(), 0, 1.3, 0.8) },
        { name: "foot_l",     geom: createSphere(0.4, 10, COLOR_FEET),       transform: Mat4.translate(Mat4.create(), -0.5, -1.2, 0.2) },
        { name: "foot_r",     geom: createSphere(0.4, 10, COLOR_FEET),       transform: Mat4.translate(Mat4.create(), 0.5, -1.2, 0.2) },
    ];

    // Add buffers to each part
    piplupParts.forEach(part => {
        part.buffers = createObjectBuffers(part.geom);
    });

    // --- 7. MOUSE INTERACTION ---

    let isDragging = false;
    let rotationY = 2.5; // Initial rotation
    let lastMouseX = 0;

    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
    });
    canvas.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('mouseout', () => isDragging = false);
    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - lastMouseX;
            rotationY += deltaX * 0.01;
            lastMouseX = e.clientX;
        }
    });

    // --- 8. THE RENDER LOOP ---

    function drawScene() {
        // Basic setup
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.6, 0.8, 1.0, 1.0); // Light blue background
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.useProgram(program);

        // Set up camera and projection
        const projectionMatrix = Mat4.perspective(Math.PI / 4, gl.canvas.width / gl.canvas.height, 1, 100);

        // Simple "camera" that just moves backward
        const viewMatrix = Mat4.translate(Mat4.create(), 0, -0.5, -7);

        gl.uniformMatrix4fv(projectionMatrixUniformLocation, false, projectionMatrix);
        gl.uniformMatrix4fv(viewMatrixUniformLocation, false, viewMatrix);

        // This is the base rotation for the entire model
        const modelBaseRotation = Mat4.rotateY(Mat4.create(), rotationY);

        // Draw each part of Piplup
        piplupParts.forEach(part => {

            // Apply the part's specific transform, then the base rotation
            const modelMatrix = Mat4.multiply(part.transform, modelBaseRotation);
            gl.uniformMatrix4fv(modelMatrixUniformLocation, false, modelMatrix);

            // Bind buffers and set attributes
            gl.bindBuffer(gl.ARRAY_BUFFER, part.buffers.vertexBuffer);
            gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 6 * 4, 0);
            gl.vertexAttribPointer(colorAttributeLocation, 3, gl.FLOAT, false, 6 * 4, 3 * 4);
            gl.enableVertexAttribArray(positionAttributeLocation);
            gl.enableVertexAttribArray(colorAttributeLocation);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.buffers.indexBuffer);

            // Draw the object
            gl.drawElements(gl.TRIANGLES, part.buffers.indexCount, gl.UNSIGNED_SHORT, 0);
        });

        // Loop the animation
        requestAnimationFrame(drawScene);
    }

    // Start the render loop
    drawScene();
});