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
    // var uniform_color = GL.getUniformLocation(SHADER_PROGRAM, "uColor");

    var triangle_vertex = [
        0, 1, // 0
        1, 0, 0, // R, G, B
        -1, 0, // 1
        1, 1, 0,
        1, 0, // 2
        0, 1, 0,
        -0.8, 0, // 3
        1, 1, 0,
        0.8, 0, // 4
        1, 1, 0,
        -0.8, -1, // 5
        1, 1, 0,
        0.8, -1, // 6
        1, 0, 0,
    ]

    var TRIANGLE_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, TRIANGLE_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER,
        new Float32Array(triangle_vertex),
        GL.STATIC_DRAW
    );

    var triangle_faces = [
        0, 1, 2,
        3, 4, 5,
        4, 5, 6
    ];
    // EBO
    var TRIANGLE_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, TRIANGLE_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(triangle_faces),
        GL.STATIC_DRAW
    );

    GL.clearColor(0., 0., 0., 0.);

    var animate = function () {
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT);

        GL.bindBuffer(GL.ARRAY_BUFFER, TRIANGLE_VERTEX);
        GL.vertexAttribPointer(_position, 2, GL.FLOAT, false, 4 * (2 + 3), 0);
        GL.vertexAttribPointer(_color, 3, GL.FLOAT, false, 4 * (3 + 2), 4 * 2);

        // GL.uniform3f(uniform_color, 1, 1, 0);
        // GL.drawArrays(GL.TRIANGLES, 0, triangle_vertex.length / 2);

        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, TRIANGLE_FACES);
        GL.drawElements(GL.TRIANGLES, triangle_faces.length, GL.UNSIGNED_SHORT, 0);

        GL.flush();
        window.requestAnimationFrame(animate);
    }
    animate();
}
window.addEventListener('load', main)