function main() {
    var CANVAS = document.getElementById("myCanvas");


    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    // init WebGL
    /** @type {WebGLRenderingContext} */
    var GL;
    try {
        GL = CANVAS.getContext("webgl", { antialias: true });
    } catch (error) {
        alert("WebGL gagal di init");
        return false;
    }

    var shader_vertex_source = `
    attribute vec3 position;
    attribute mat4 Pmatrix, Vmatrix, Mmatrix; 
    attribute vec3 color;
    varying vec3 vColor; //is a variable that can transfer from shader_vertex to shader_fragment
    
    void main(void) {
        gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.);
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

    var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
    var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");

    GL.useProgram(SHADER_PROGRAM);
    // var uniform_color = GL.getUniformLocation(SHADER_PROGRAM, "uColor");

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

    var CUBE_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER,
        new Float32Array(cube_vertex),
        GL.STATIC_DRAW
    );

    // EBO
    var CUBE_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(cube_faces),
        GL.STATIC_DRAW
    );

    //Siapin Matrix, 40 ini FOV, CANVAS.width / CANVAS.height aspect ratio, 1 range minimum render, 100 range maximum render
    var PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    var MOVEMATRIX = LIBS.get_I4();
    var VIEWMATRIX = LIBS.get_I4();

    LIBS.translateZ(MOVEMATRIX, -6);

    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearColor(0., 0., 0., 0.);
    GL.clearDepth(1.);

    var animate = function () {
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT);

        LIBS.rotateZ(MOVEMATRIX, 0.01);

        GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);
        GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX);

        GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * (3 + 3), 0);
        GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * (3 + 3), 4 * 3);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
        // 6 sisi, 2 vertex, 3 color
        GL.drawElements(GL.TRIANGLES, 6 * 2 * 3, GL.UNSIGNED_SHORT, 0);

        // GL.uniform3f(uniform_color, 1, 1, 0);
        // GL.drawArrays(GL.TRIANGLES, 0, triangle_vertex.length / 2);

        GL.flush();
        window.requestAnimationFrame(animate);
    }
    animate();
}
window.addEventListener('load', main)