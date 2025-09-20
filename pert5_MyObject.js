export class MyObject {
    GL = null;
    SHADER_PROGRAM = null;

    _position = null;
    _color = null;
    _MMatrix = null;

    OBJECT_VERTEX = null;
    OBJECT_FACES = null;


    vertex = [];
    faces = [];
    MODEL_MATRIX = LIBS.get_I4();


    constructor(GL, SHADER_PROGRAM, _position, _color) {
        this.GL = GL;
        this.SHADER_PROGRAM = SHADER_PROGRAM;


        this._position = _position;
        this._color = _color;


        this.vertex = [
            -1, -1, -1, 0, 0, 0,
            1, -1, -1, 1, 0, 0,
            1, 1, -1, 1, 1, 0,
            -1, 1, -1, 0, 1, 0,
            -1, -1, 1, 0, 0, 1,
            1, -1, 1, 1, 0, 1,
            1, 1, 1, 1, 1, 1,
            -1, 1, 1, 0, 1, 1
        ];


        this.faces = [
            0, 1, 2, 0, 2, 3,
            4, 5, 6, 4, 6, 7,
            0, 3, 7, 0, 4, 7,
            1, 2, 6, 1, 5, 6,
            2, 3, 6, 3, 7, 6,
            0, 1, 5, 0, 4, 5
        ];
    }


    setup() {
        this.OBJECT_VERTEX = this.GL.createBuffer();
        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
        this.GL.bufferData(this.GL.ARRAY_BUFFER,
            new Float32Array(this.vertex),
            this.GL.STATIC_DRAW);


        this.OBJECT_FACES = this.GL.createBuffer();
        this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);
        this.GL.bufferData(this.GL.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(this.faces),
            this.GL.STATIC_DRAW);
    }


    render(_MMatrix) {
        this.GL.useProgram(this.SHADER_PROGRAM);


        this.GL.uniformMatrix4fv(_MMatrix, false, this.MODEL_MATRIX);


        this.GL.vertexAttribPointer(this._position, 3, this.GL.FLOAT, false, 4 * (3 + 3), 0);
        this.GL.vertexAttribPointer(this._color, 3, this.GL.FLOAT, false, 4 * (3 + 3), 4 * 3);

        this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.OBJECT_VERTEX);
        this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, this.OBJECT_FACES);

        this.GL.drawElements(this.GL.TRIANGLES, this.faces.length, this.GL.UNSIGNED_SHORT, 0);
    }
}