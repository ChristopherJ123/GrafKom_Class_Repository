function main() {
    /** @type {HTMLCanvasElement} */
    var CANVAS = document.getElementById("myCanvas");
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;


    /*================== CAPTURE MOUSE EVENT =================== */
    var drag = false;
    var x_prev, y_prev;
    var dX = 0, dY = 0;
    var FRICTION = 0.05;
    var THETA = 0, PHI = 0;
    var SPEED = 0.05;


    var keyDown = function (e) {
        if (drag) return false;
        if (e.key === 'w')
            dY -= SPEED;
        else if (e.key === 'a')
            dX -= SPEED;
        else if (e.key === 's')
            dY += SPEED;
        else if (e.key === 'd')
            dX += SPEED;
    }


    var mouseDown = function (e) {
        drag = true;
        // console.log(e.pageX, e.pageY);
        x_prev = e.pageX, y_prev = e.pageY;
        e.preventDefault();
        return false;
    }


    var mouseUp = function (e) {
        drag = false;
    }


    var mouseMove = function (e) {
        if (!drag) return false;
        dX = (e.pageX - x_prev) * 2 * Math.PI / CANVAS.width;
        dY = (e.pageY - y_prev) * 2 * Math.PI / CANVAS.height;
        THETA += dX;
        PHI += dY;


        x_prev = e.pageX, y_prev = e.pageY;
        e.preventDefault();
    }


    CANVAS.addEventListener("mousedown", mouseDown, false);
    CANVAS.addEventListener("mouseup", mouseUp, false);
    CANVAS.addEventListener("mouseout", mouseUp, false);
    CANVAS.addEventListener("mousemove", mouseMove, false);
    window.addEventListener("keydown", keyDown, false);


    /*===================== GET WEBGL CONTEXT ===================== */
    /** @type {WebGLRenderingContext} */
    var GL;
    try {
        GL = CANVAS.getContext("webgl", { antialias: true });
    } catch (e) {
        alert("WebGL context cannot be initialized");
        return false;
    }


    /*========================= SHADERS ========================= */
    var shader_vertex_source = `
        attribute vec3 position;
        uniform mat4 Pmatrix, Vmatrix, Mmatrix;
        attribute vec3 color;  // the color of the point
        varying vec3 vColor; //is a variable that can transfer from shader_vertex to shader_fragment
       
        void main(void) {
            gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.);
            vColor = color;
        }`;


    var shader_fragment_source = `
        precision mediump float;
        varying vec3 vColor;
        uniform float greyScality;
   
        void main(void) {
            float greyScaleValue = (vColor.r + vColor.g + vColor.b) / 3.;
            vec3 greyScaleColor = vec3(greyScaleValue);
            vec3 color = mix(vColor, greyScaleColor, greyScality);


            gl_FragColor = vec4(color, 1.);
        }`;


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
    GL.enableVertexAttribArray(_position);


    var _color = GL.getAttribLocation(SHADER_PROGRAM, "color");
    GL.enableVertexAttribArray(_color);


    var _greyscality = GL.getUniformLocation(SHADER_PROGRAM, "greyScality");


    var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
    var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");


    GL.useProgram(SHADER_PROGRAM);


    /*======================== THE TRIANGLE ======================== */
    // POINTS:
    var cube_vertex = [
        -1, -1, -1,
        0, 0, 0,


        1, -1, -1,
        1, 0, 0,


        1, 1, -1,
        1, 1, 0,


        -1, 1, -1,
        0, 1, 0,


        -1, -1, 1,
        0, 0, 1,


        1, -1, 1,
        1, 0, 1,


        1, 1, 1,
        1, 1, 1,


        -1, 1, 1,
        0, 1, 1
    ];


    var CUBE_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER,
        new Float32Array(cube_vertex),
        GL.STATIC_DRAW);


    // FACES:
    var cube_faces = [
        0, 1, 2,
        0, 2, 3,


        4, 5, 6,
        4, 6, 7,


        0, 3, 7,
        0, 4, 7,


        1, 2, 6,
        1, 5, 6,


        2, 3, 6,
        3, 7, 6,


        0, 1, 5,
        0, 4, 5
    ];


    var CUBE_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(cube_faces),
        GL.STATIC_DRAW);


    /*========================= MATRIX ========================= */
    var PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    var VIEWMATRIX = LIBS.get_I4();
    var MOVEMATRIX = LIBS.get_I4();

    LIBS.translateZ(VIEWMATRIX, -6);
    /*========================= DRAWING ========================= */
    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearColor(0.0, 0.0, 0.0, 0.0);
    GL.clearDepth(1.0);

    var time_prev = 0;
    var animate = function (time) {
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);


        var dt = (time - time_prev)/1000;
        time_prev = time;


        if (!drag) {
            dX *= (1-FRICTION), dY *= (1-FRICTION);
            THETA += dX, PHI += dY;
        }


        LIBS.set_I4(MOVEMATRIX);
        LIBS.rotateY(MOVEMATRIX, THETA);
        LIBS.rotateX(MOVEMATRIX, PHI);
        // LIBS.rotateZ(MOVEMATRIX, dt * LIBS.degToRad(90));
        // LIBS.rotateY(MOVEMATRIX, dt * LIBS.degToRad(90));
        // LIBS.rotateX(MOVEMATRIX, dt * LIBS.degToRad(90));


        GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);
        GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX);


        GL.uniform1f(_greyscality, 1);


        GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * (3 + 3), 0);
        GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * (3 + 3), 4 * 3);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
        GL.drawElements(GL.TRIANGLES, cube_faces.length, GL.UNSIGNED_SHORT, 0);


        GL.flush();
        window.requestAnimationFrame(animate);
    };
    animate(0);
}
window.addEventListener('load', main);


function main() {
    /** @type {HTMLCanvasElement} */
    var CANVAS = document.getElementById("myCanvas");
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;


    /*================== CAPTURE MOUSE EVENT =================== */
    var drag = false;
    var x_prev, y_prev;
    var dX = 0, dY = 0;
    var FRICTION = 0.05;
    var THETA = 0, PHI = 0;
    var SPEED = 0.05;


    var keyDown = function (e) {
        if (drag) return false;
        if (e.key === 'w')
            dY -= SPEED;
        else if (e.key === 'a')
            dX -= SPEED;
        else if (e.key === 's')
            dY += SPEED;
        else if (e.key === 'd')
            dX += SPEED;
    }


    var mouseDown = function (e) {
        drag = true;
        // console.log(e.pageX, e.pageY);
        x_prev = e.pageX, y_prev = e.pageY;
        e.preventDefault();
        return false;
    }


    var mouseUp = function (e) {
        drag = false;
    }


    var mouseMove = function (e) {
        if (!drag) return false;
        dX = (e.pageX - x_prev) * 2 * Math.PI / CANVAS.width;
        dY = (e.pageY - y_prev) * 2 * Math.PI / CANVAS.height;
        THETA += dX;
        PHI += dY;


        x_prev = e.pageX, y_prev = e.pageY;
        e.preventDefault();
    }


    CANVAS.addEventListener("mousedown", mouseDown, false);
    CANVAS.addEventListener("mouseup", mouseUp, false);
    CANVAS.addEventListener("mouseout", mouseUp, false);
    CANVAS.addEventListener("mousemove", mouseMove, false);
    window.addEventListener("keydown", keyDown, false);


    /*===================== GET WEBGL CONTEXT ===================== */
    /** @type {WebGLRenderingContext} */
    var GL;
    try {
        GL = CANVAS.getContext("webgl", { antialias: true });
    } catch (e) {
        alert("WebGL context cannot be initialized");
        return false;
    }


    /*========================= SHADERS ========================= */
    var shader_vertex_source = `
        attribute vec3 position;
        uniform mat4 Pmatrix, Vmatrix, Mmatrix;
        //attribute vec3 color;  // the color of the point
        //varying vec3 vColor; //is a variable that can transfer from shader_vertex to shader_fragment
        attribute vec2 uv;
        varying vec2 vUV;


        void main(void) {
            gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.);
            //vColor = color;


            vUV = uv;
        }`;


    var shader_fragment_source = `
        precision mediump float;
        uniform sampler2D sampler;
        //varying vec3 vColor;
        varying vec2 vUV;
        //uniform float greyScality;
   
        void main(void) {
            //float greyScaleValue = (vColor.r + vColor.g + vColor.b) / 3.;
            //vec3 greyScaleColor = vec3(greyScaleValue);
            //vec3 color = mix(vColor, greyScaleColor, greyScality);


            //gl_FragColor = vec4(color, 1.);
            gl_FragColor = texture2D(sampler, vUV);
        }`;


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
    GL.enableVertexAttribArray(_position);


    // var _color = GL.getAttribLocation(SHADER_PROGRAM, "color");
    // GL.enableVertexAttribArray(_color);


    var _uv = GL.getAttribLocation(SHADER_PROGRAM, "uv");
    GL.enableVertexAttribArray(_uv);


    // var _greyscality = GL.getUniformLocation(SHADER_PROGRAM, "greyScality");
    var _sampler = GL.getUniformLocation(SHADER_PROGRAM, "sampler");


    var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
    var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");


    GL.useProgram(SHADER_PROGRAM);
    GL.uniform1i(_sampler, 0);


    /*======================== THE TRIANGLE ======================== */
    // POINTS:
    var cube_vertex = [
        // Belakang
        -1,-1,-1,    0,0,
        1,-1,-1,     1,0,
        1, 1,-1,     1,1,
        -1, 1,-1,    0,1,

        // Depan
        -1,-1, 1,    0,0,
        1,-1, 1,     1,0,
        1, 1, 1,     1,1,
        -1, 1, 1,    0,1,

        // Kiri
        -1,-1,-1,    0,0,
        -1, 1,-1,    1,0,
        -1, 1, 1,    1,1,
        -1,-1, 1,    0,1,


        1,-1,-1,     0,0,
        1, 1,-1,     1,0,
        1, 1, 1,     1,1,
        1,-1, 1,     0,1,


        -1,-1,-1,    0,0,
        -1,-1, 1,    1,0,
        1,-1, 1,     1,1,
        1,-1,-1,     0,1,

        // Atas
        -1, 1,-1,    0,0,
        -1, 1, 1,    1,0,
        1, 1, 1,     1,1,
        1, 1,-1,     0,1
    ];


    var CUBE_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER,
        new Float32Array(cube_vertex),
        GL.STATIC_DRAW);


    // FACES:
    var cube_faces = [
        0, 1, 2,
        0, 2, 3,


        4, 5, 6,
        4, 6, 7,


        8, 9, 10,
        8, 10, 11,


        12, 13, 14,
        12, 14, 15,


        16, 17, 18,
        16, 18, 19,


        20, 21, 22,
        20, 22, 23
    ];


    var CUBE_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(cube_faces),
        GL.STATIC_DRAW);


    /*========================= MATRIX ========================= */
    var PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    var VIEWMATRIX = LIBS.get_I4();
    var MOVEMATRIX = LIBS.get_I4();

    LIBS.translateZ(VIEWMATRIX, -6);


    /*========================= TEXTURES ========================= */
    var load_texture = function (image_URL) {
        var texture = GL.createTexture();
        var image = new Image();


        image.src = image_URL;
        image.onload = function (e) {
            GL.bindTexture(GL.TEXTURE_2D, texture);
            GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, true);
            GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, image);
            // GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
            // GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST_MIPMAP_LINEAR);
            // GL.generateMipmap(GL.TEXTURE_2D);
            GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
            GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
            GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
            GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
            GL.bindTexture(GL.TEXTURE_2D, null);
        };


        return texture;
    };


    // var cube_texture = load_texture("favicon.png");
    var cube_texture = load_texture("Resource/semangka.png");
    /*========================= DRAWING ========================= */
    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearColor(0.0, 0.0, 0.0, 0.0);
    GL.clearDepth(1.0);

    var time_prev = 0;
    var animate = function (time) {
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);


        var dt = (time - time_prev)/1000;
        time_prev = time;


        if (!drag) {
            dX *= (1-FRICTION), dY *= (1-FRICTION);
            THETA += dX, PHI += dY;
        }


        LIBS.set_I4(MOVEMATRIX);
        LIBS.rotateY(MOVEMATRIX, THETA);
        LIBS.rotateX(MOVEMATRIX, PHI);
        // LIBS.rotateZ(MOVEMATRIX, dt * LIBS.degToRad(90));
        // LIBS.rotateY(MOVEMATRIX, dt * LIBS.degToRad(90));
        // LIBS.rotateX(MOVEMATRIX, dt * LIBS.degToRad(90));


        GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);
        GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX);


        // GL.uniform1f(_greyscality, 1);
        GL.activeTexture(GL.TEXTURE0);
        GL.bindTexture(GL.TEXTURE_2D, cube_texture);


        GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * (3 + 2), 0);
        GL.vertexAttribPointer(_uv, 3, GL.FLOAT, false, 4 * (3 + 2), 4 * 3);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
        GL.drawElements(GL.TRIANGLES, cube_faces.length, GL.UNSIGNED_SHORT, 0);


        GL.flush();
        window.requestAnimationFrame(animate);
    };
    animate(0);
}
window.addEventListener('load', main);