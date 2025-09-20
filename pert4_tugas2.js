function main() {
    //GET CANVAS
    var CANVAS = document.getElementById("myCanvas");

    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    var drag = false;
    var x_prev, y_prev;
    var mouseDown = function (e) {
        drag = true;
        x_prev = e.pageX, y_prev = e.pageY;
        e.preventDefault();
        return false;
    };
    var mouseUp = function (e) {
        drag = false;
    };
    var mouseMove = function (e) {
        if (!drag) return false;
        dX = (e.pageX - x_prev) * 2 * Math.PI / CANVAS.width;
        dY = (e.pageY - y_prev) * 2 * Math.PI / CANVAS.height;
        THETA += dX;
        PHI += dY;
        x_prev = e.pageX, y_prev = e.pageY;
        e.preventDefault();
    };


    CANVAS.addEventListener("mousedown", mouseDown, false);
    CANVAS.addEventListener("mouseup", mouseUp, false);
    CANVAS.addEventListener("mouseout", mouseUp, false);
    CANVAS.addEventListener("mousemove", mouseMove, false);

    var keyDown = function (e) {
        if (e.key === 'w') {
            dY -= SPEED;
        }
        else if (e.key === 'a') {
            dX -= SPEED;
        }
        else if (e.key === 's') {
            dY += SPEED;
        }
        else if (e.key === 'd') {
            dX += SPEED;
        }
    }
    window.addEventListener("keydown", keyDown, false);


    //INIT WEBGL
    /** @type {WebGLRenderingContext} */
    var GL;
    try {
        GL = CANVAS.getContext("webgl", { antialias: true });
    } catch (e) {
        alert("WebGL context cannot be initialized");
        return false;
    }

    //INIT SHADERS: berupa teks
    var shader_vertex_source = `
        attribute vec3 position;
        uniform mat4 Pmatrix, Vmatrix, Mmatrix;
        attribute vec3 color;  
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


    //SHADER COMPILER: menjadikan object
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

    //PROGRAM SHADER: mengaktifkan shader
    var SHADER_PROGRAM = GL.createProgram();
    GL.attachShader(SHADER_PROGRAM, shader_vertex);
    GL.attachShader(SHADER_PROGRAM, shader_fragment);

    GL.linkProgram(SHADER_PROGRAM);

    var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
    GL.enableVertexAttribArray(_position);

    var _color = GL.getAttribLocation(SHADER_PROGRAM, "color");
    GL.enableVertexAttribArray(_color);


    var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
    var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");

    GL.useProgram(SHADER_PROGRAM);

    ///mulai disini
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


        for (var i = 0; i <= stack; i++) {
            for (var j = 0; j < step; j++) {
                var a = i * step + j;
                var b = a + 1;
                var c = a + step;
                var d = a + step + 1;
                faces.push(a, b, d);
                faces.push(a, d, c);
            }
        }
        return { vertices, faces };
    }

    var sphere = generateSphere(1, 1, 1, 100, 100);

    var sphere_vertex = sphere.vertices;

    /**
     * Generates vertices for a 3D Catmull-Rom spline.
     * @param {Array<Array<number>>} controlPoints - An array of 3D points (e.g., [[x1, y1, z1], [x2, y2, z2], ...])
     * @param {number} segments - The number of line segments to create between each control point. Higher is smoother.
     * @returns {{vertices: Array<number>}} - An object containing the generated vertices [x,y,z, r,g,b, ...].
     */
    function generateSpline(controlPoints, segments) {
        var vertices = [];
        var points = [];

        // A Catmull-Rom spline needs points before and after the segment it's drawing.
        // We duplicate the first and last points to satisfy this condition for the endpoints.
        points.push(controlPoints[0]);
        controlPoints.forEach(p => points.push(p));
        points.push(controlPoints[controlPoints.length - 1]);

        // Loop through the actual control points (not the duplicated endpoints).
        for (var i = 1; i < points.length - 2; i++) {
            var p0 = points[i - 1];
            var p1 = points[i];
            var p2 = points[i + 1];
            var p3 = points[i + 2];

            // Loop to generate the points for the curve segment between p1 and p2.
            for (var j = 0; j <= segments; j++) {
                var t = j / segments;
                var t2 = t * t;
                var t3 = t2 * t;

                // Catmull-Rom spline formula
                var x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
                var y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
                var z = 0.5 * ((2 * p1[2]) + (-p0[2] + p2[2]) * t + (2 * p0[2] - 5 * p1[2] + 4 * p2[2] - p3[2]) * t2 + (-p0[2] + 3 * p1[2] - 3 * p2[2] + p3[2]) * t3);

                vertices.push(x, y, z);

                // Add a color based on the position, similar to the sphere example.
                vertices.push(x / 2 + 0.5, y / 2 + 0.5, z / 2 + 0.5);
            }
        }
        return { vertices };
    }

    // --- CREATE THE SPLINE ---
    // Define the control points for our spline.
    var controlPoints = [
        [-2, 0, 1.5],
        [-1, 1.5, 1],
        [0, 0, 0.5],
        [1, -1.5, 0],
        [2, 0, -0.5],
        [1.5, 1, -1],
        [0, 0, -1.5]
    ];

    // Generate the spline geometry with 100 segments between each control point.
    var spline = generateSpline(controlPoints, 100);
    var spline_vertex = spline.vertices;


    //VBO: array vertex di memori GPU
    var SPHERE_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, SPHERE_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER,
        new Float32Array(sphere_vertex),
        GL.STATIC_DRAW);


    // Create a Vertex Buffer Object (VBO) for the spline.
    var SPLINE_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, SPLINE_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER,
        new Float32Array(spline_vertex),
        GL.STATIC_DRAW);


    var sphere_faces = sphere.faces;

    //EBO
    var SPHERE_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, SPHERE_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(sphere_faces),
        GL.STATIC_DRAW);

    ///jangan lupa nama var/ GL DRAW.LENGTH

    var PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    var MOVEMATRIX = LIBS.get_I4();
    var VIEWMATRIX = LIBS.get_I4();


    LIBS.translateZ(VIEWMATRIX, -6);

    var THETA = 0, PHI = 0;
    var FRICTION = 0.15;
    var dX = 0, dY = 0;
    var SPEED = 0.05;

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
            dX *= (1 - FRICTION), dY *= (1 - FRICTION);
            THETA += dX, PHI += dY;
        }


        LIBS.set_I4(MOVEMATRIX);
        LIBS.rotateY(MOVEMATRIX, THETA);
        LIBS.rotateX(MOVEMATRIX, PHI);

        GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);
        GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX);

        // Draw sphere
        // GL.bindBuffer(GL.ARRAY_BUFFER, SPHERE_VERTEX);

        // --- DRAW THE SPLINE ---
        // GL.bindBuffer(GL.ARRAY_BUFFER, SPLINE_VERTEX);

        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * (3 + 3), 0);
        GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * (3 + 3), 3 * 4);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, SPHERE_FACES);
        GL.drawElements(GL.TRIANGLES, sphere_faces.length, GL.UNSIGNED_SHORT, 0);

        GL.flush();
        window.requestAnimationFrame(animate);
    };
    animate(0);
}
window.addEventListener('load', main);