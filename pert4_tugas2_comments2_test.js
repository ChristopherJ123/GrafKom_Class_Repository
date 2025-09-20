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
    var THETA = 0, PHI = 0; // Rotation angles for the scene.
    var FRICTION = 0.15; // Damping factor to slow down rotation when not dragging.
    var SPEED = 0.05; // Rotation speed when using keyboard controls.

    // Function to handle the 'mousedown' event.
    var mouseDown = function (e) {
        drag = true;
        x_prev = e.pageX, y_prev = e.pageY; // Store the initial mouse position.
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
        PHI += dY; // Update the vertical rotation angle.
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
        } else if (e.key === 'a') { // Rotate left
            dX -= SPEED;
        } else if (e.key === 's') { // Rotate down
            dY += SPEED;
        } else if (e.key === 'd') { // Rotate right
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
        GL = CANVAS.getContext("webgl", {
            antialias: true
        });
    } catch (e) {
        alert("WebGL context cannot be initialized");
        return false;
    }

    // --- SHADERS ---

    var shader_vertex_source = `
        attribute vec3 position;
        attribute vec3 color;
        uniform mat4 Pmatrix, Vmatrix, Mmatrix;
        varying vec3 vColor;
        void main(void) {
            gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.);
            vColor = color;
        }`;

    var shader_fragment_source = `
        precision mediump float;
        varying vec3 vColor;
        void main(void) {
            gl_FragColor = vec4(vColor, 1.);
        }`;

    // --- SHADER COMPILATION AND PROGRAM LINKING ---

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

    var SHADER_PROGRAM = GL.createProgram();
    GL.attachShader(SHADER_PROGRAM, shader_vertex);
    GL.attachShader(SHADER_PROGRAM, shader_fragment);
    GL.linkProgram(SHADER_PROGRAM);

    var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
    var _color = GL.getAttribLocation(SHADER_PROGRAM, "color");
    var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
    var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");

    GL.enableVertexAttribArray(_position);
    GL.enableVertexAttribArray(_color);
    GL.useProgram(SHADER_PROGRAM);

    // --- GEOMETRY GENERATION ---

    function generateSphere(a, b, c, stack, step) {
        var vertices = [];
        var faces = [];
        for (var i = 0; i <= stack; i++) {
            for (var j = 0; j <= step; j++) {
                var u = i / stack * Math.PI - (Math.PI / 2);
                var v = j / step * 2 * Math.PI - Math.PI;
                var x = a * Math.cos(v) * Math.cos(u);
                var y = b * Math.sin(u);
                var z = c * Math.sin(v) * Math.cos(u);
                vertices.push(x, y, z);
                vertices.push(...[x, y, z].map(val => val / 2 + 0.5));
            }
        }
        for (var i = 0; i < stack; i++) {
            for (var j = 0; j < step; j++) {
                var p1 = i * (step + 1) + j;
                var p2 = p1 + 1;
                var p3 = p1 + (step + 1);
                var p4 = p3 + 1;
                faces.push(p1, p2, p4);
                faces.push(p1, p4, p3);
            }
        }
        return {
            vertices,
            faces
        };
    }

    function generateTubeFromSpline(controlPoints, segments, radius, radialSegments) {
        var vertices = [];
        var faces = [];
        var splinePoints = [];
        var tangents = [];

        var points = [];
        points.push(controlPoints[0]);
        controlPoints.forEach(p => points.push(p));
        points.push(controlPoints[controlPoints.length - 1]);

        for (var i = 1; i < points.length - 2; i++) {
            var p0 = points[i - 1];
            var p1 = points[i];
            var p2 = points[i + 1];
            var p3 = points[i + 2];

            for (var j = 0; j <= segments; j++) {
                var t = j / segments;
                var t2 = t * t;
                var t3 = t2 * t;

                var x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
                var y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
                var z = 0.5 * ((2 * p1[2]) + (-p0[2] + p2[2]) * t + (2 * p0[2] - 5 * p1[2] + 4 * p2[2] - p3[2]) * t2 + (-p0[2] + 3 * p1[2] - 3 * p2[2] + p3[2]) * t3);
                splinePoints.push([x, y, z]);

                var tx = 0.5 * ((-p0[0] + p2[0]) + 2 * (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t + 3 * (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t2);
                var ty = 0.5 * ((-p0[1] + p2[1]) + 2 * (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t + 3 * (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t2);
                var tz = 0.5 * ((-p0[2] + p2[2]) + 2 * (2 * p0[2] - 5 * p1[2] + 4 * p2[2] - p3[2]) * t + 3 * (-p0[2] + 3 * p1[2] - 3 * p2[2] + p3[2]) * t2);

                var mag = Math.sqrt(tx * tx + ty * ty + tz * tz);
                tangents.push([tx / mag, ty / mag, tz / mag]);
            }
        }

        var up = [0, 1, 0];
        for (var i = 0; i < splinePoints.length; i++) {
            var point = splinePoints[i];
            var tangent = tangents[i];

            if (Math.abs(tangent[1]) > 0.999) {
                up = [1, 0, 0];
            } else {
                up = [0, 1, 0];
            }

            var normal = [tangent[1] * up[2] - tangent[2] * up[1], tangent[2] * up[0] - tangent[0] * up[2], tangent[0] * up[1] - tangent[1] * up[0]];
            var magN = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
            normal = [normal[0] / magN, normal[1] / magN, normal[2] / magN];

            var binormal = [tangent[1] * normal[2] - tangent[2] * normal[1], tangent[2] * normal[0] - tangent[0] * normal[2], tangent[0] * normal[1] - tangent[1] * normal[0]];

            for (var j = 0; j <= radialSegments; j++) {
                var theta = (j / radialSegments) * 2 * Math.PI;
                var x = point[0] + radius * (Math.cos(theta) * normal[0] + Math.sin(theta) * binormal[0]);
                var y = point[1] + radius * (Math.cos(theta) * normal[1] + Math.sin(theta) * binormal[1]);
                var z = point[2] + radius * (Math.cos(theta) * normal[2] + Math.sin(theta) * binormal[2]);
                vertices.push(x, y, z);
                vertices.push(j / radialSegments, i / splinePoints.length, 0.5);
            }
        }

        for (var i = 0; i < splinePoints.length - 1; i++) {
            for (var j = 0; j < radialSegments; j++) {
                var p1 = i * (radialSegments + 1) + j;
                var p2 = p1 + 1;
                var p3 = (i + 1) * (radialSegments + 1) + j;
                var p4 = p3 + 1;
                faces.push(p1, p2, p4);
                faces.push(p1, p4, p3);
            }
        }
        return { vertices, faces };
    }

    function generateHyperbolicParaboloid(a, b, width, depth, segmentsX, segmentsZ, transX, transY, transZ) {
        var vertices = [];
        var faces = [];

        for (var i = 0; i <= segmentsZ; i++) {
            for (var j = 0; j <= segmentsX; j++) {
                var x = (j / segmentsX - 0.5) * width;
                var z = (i / segmentsZ - 0.5) * depth;
                var y = (z * z) / (b * b) - (x * x) / (a * a);

                vertices.push(x + transX, y + transY, z + transZ);

                var colorR = j / segmentsX;
                var colorG = i / segmentsZ;
                var colorB = 0.5;
                vertices.push(colorR, colorG, colorB);
            }
        }

        for (var i = 0; i < segmentsZ; i++) {
            for (var j = 0; j < segmentsX; j++) {
                var p1 = i * (segmentsX + 1) + j;
                var p2 = p1 + 1;
                var p3 = (i + 1) * (segmentsX + 1) + j;
                var p4 = p3 + 1;

                faces.push(p1, p2, p4);
                faces.push(p1, p4, p3);
            }
        }
        return {
            vertices,
            faces
        };
    }

    // --- CREATE GEOMETRY DATA ---
    var sphere = generateSphere(0.5, 0.5, 0.5, 100, 100);
    var sphere_vertex = sphere.vertices;
    var sphere_faces = sphere.faces;

    var controlPoints = [
        [-4, 1, 0],
        [-2, -1, 0],
        [0, 1.5, 0],
        [2, -1, 0],
        [4, 1, 0],
    ];
    var tube = generateTubeFromSpline(controlPoints, 100, 0.2, 20);
    var tube_vertex = tube.vertices;
    var tube_faces = tube.faces;

    var hyperbolicParaboloid = generateHyperbolicParaboloid(1, 1, 2, 2, 50, 50, 0, -2, 0);
    var hp_vertex = hyperbolicParaboloid.vertices;
    var hp_faces = hyperbolicParaboloid.faces;

    // --- BUFFERS (SENDING GEOMETRY TO GPU) ---

    // Buffers for the Sphere
    var SPHERE_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, SPHERE_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(sphere_vertex), GL.STATIC_DRAW);

    var SPHERE_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, SPHERE_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphere_faces), GL.STATIC_DRAW);

    // Buffers for the Tube
    var TUBE_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, TUBE_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(tube_vertex), GL.STATIC_DRAW);

    var TUBE_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, TUBE_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(tube_faces), GL.STATIC_DRAW);


    // Buffers for the Hyperbolic Paraboloid
    var HP_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, HP_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(hp_vertex), GL.STATIC_DRAW);

    var HP_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, HP_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(hp_faces), GL.STATIC_DRAW);


    // --- MATRICES AND CAMERA SETUP ---
    var PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    var MOVEMATRIX = LIBS.get_I4();
    var VIEWMATRIX = LIBS.get_I4();

    LIBS.translateZ(VIEWMATRIX, -8);

    // --- WEBGL STATE AND RENDER LOOP ---
    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearColor(0.0, 0.0, 0.0, 0.0);
    GL.clearDepth(1.0);

    var time_prev = 0;

    var animate = function (time) {
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

        var dt = time - time_prev;
        time_prev = time;

        if (!drag) {
            dX *= (1 - FRICTION);
            dY *= (1 - FRICTION);
            THETA += dX;
            PHI += dY;
        }

        LIBS.set_I4(MOVEMATRIX);
        LIBS.rotateY(MOVEMATRIX, THETA);
        LIBS.rotateX(MOVEMATRIX, PHI);

        GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);
        GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX);

        // --- DRAW THE OBJECTS ---

        // 1. Draw the Sphere
        GL.bindBuffer(GL.ARRAY_BUFFER, SPHERE_VERTEX);
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * (3 + 3), 0);
        GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * (3 + 3), 3 * 4);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, SPHERE_FACES);
        GL.drawElements(GL.TRIANGLES, sphere_faces.length, GL.UNSIGNED_SHORT, 0);

        // 2. Draw the Tube
        GL.bindBuffer(GL.ARRAY_BUFFER, TUBE_VERTEX);
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * (3 + 3), 0);
        GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * (3 + 3), 3 * 4);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, TUBE_FACES);
        GL.drawElements(GL.TRIANGLES, tube_faces.length, GL.UNSIGNED_SHORT, 0);

        // 3. Draw the Hyperbolic Paraboloid
        GL.bindBuffer(GL.ARRAY_BUFFER, HP_VERTEX);
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * (3 + 3), 0);
        GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * (3 + 3), 3 * 4);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, HP_FACES);
        GL.drawElements(GL.TRIANGLES, hp_faces.length, GL.UNSIGNED_SHORT, 0);


        GL.flush();
        window.requestAnimationFrame(animate);
    };

    animate(0);
}

window.addEventListener('load', main);

