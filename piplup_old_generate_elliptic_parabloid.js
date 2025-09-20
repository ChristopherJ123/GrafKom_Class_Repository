// --- UTILITY FOR GEOMETRY ---
// We place the geometry generation logic in its own object to keep things organized.
const Geometry = {
    generateSphere: function (a, b, c, stack, step, color) {
        const vertices = [];
        const faces = [];
        for (let i = 0; i <= stack; i++) {
            for (let j = 0; j <= step; j++) {
                const u = i / stack * Math.PI - (Math.PI / 2);
                const v = j / step * 2 * Math.PI - Math.PI;
                const x = a * Math.cos(v) * Math.cos(u);
                const y = b * Math.sin(u);
                const z = c * Math.sin(v) * Math.cos(u);
                vertices.push(x, y, z, color[0], color[1], color[2]);
            }
        }
        for (let i = 0; i < stack; i++) {
            for (let j = 0; j < step; j++) {
                const p1 = i * (step + 1) + j;
                const p2 = p1 + 1;
                const p3 = p1 + (step + 1);
                const p4 = p3 + 1;
                faces.push(p1, p2, p4, p1, p4, p3);
            }
        }
        return { vertices, faces };
    },

    /**
     * Generates an elliptic paraboloid shape, ideal for a beak.
     * @param {number} a - Scaling factor along the x-axis.
     * @param {number} b - Scaling factor along the y-axis.
     * @param {number} height - The height of the paraboloid along the z-axis.
     * @param {number} segments - The number of segments for resolution.
     * @param {Array<number>} color - The RGB color array.
     * @returns {{vertices: Array<number>, faces: Array<number>}}
     */
    generateEllipticParaboloid: function(a, b, height, segments, color) {
        const vertices = [];
        const faces = [];
        // Center vertex at the tip of the paraboloid
        vertices.push(0, 0, 0, color[0], color[1], color[2]);

        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * 2 * Math.PI;
            const x = a * Math.cos(theta);
            const y = b * Math.sin(theta);
            // The z coordinate is calculated based on the elliptic paraboloid equation
            // We use height as a scaling factor for the "depth" of the beak
            const z = height * ((x*x)/(a*a) + (y*y)/(b*b));
            vertices.push(x, y, z, color[0], color[1], color[2]);
        }

        for (let i = 1; i <= segments; i++) {
            faces.push(0, i, i + 1);
        }
        // Connect the last vertex back to the first one to close the shape
        faces.push(0, segments + 1, 1);

        return { vertices, faces };
    }
};

// --- PIPLUP PART CLASS ---
// Represents a single drawable part of the Piplup model.
class PiplupPart {
    constructor(gl, geometry) {
        this.gl = gl;
        this.geometry = geometry;
        this.modelMatrix = LIBS.get_I4();
        this.buffers = this.createBuffers();
    }

    createBuffers() {
        const vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.geometry.vertices), this.gl.STATIC_DRAW);

        const facesBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, facesBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.geometry.faces), this.gl.STATIC_DRAW);

        return { vertex: vertexBuffer, faces: facesBuffer, faces_length: this.geometry.faces.length };
    }

    // Set the local transformation for this part (e.g., move it up, to the side, etc.)
    setTransform(transformMatrix) {
        this.modelMatrix = transformMatrix;
    }

    draw(shader, parentMatrix) {
        const gl = this.gl;
        const finalMatrix = LIBS.multiply(this.modelMatrix, parentMatrix);
        gl.uniformMatrix4fv(shader.locations.Mmatrix, false, finalMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertex);
        gl.vertexAttribPointer(shader.locations.position, 3, gl.FLOAT, false, 4 * 6, 0);
        gl.vertexAttribPointer(shader.locations.color, 3, gl.FLOAT, false, 4 * 6, 3 * 4);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.faces);
        gl.drawElements(gl.TRIANGLES, this.buffers.faces_length, gl.UNSIGNED_SHORT, 0);
    }
}

// --- PIPLUP CONTAINER CLASS ---
// Manages all the parts that make up the Piplup.
class Piplup {
    constructor(gl) {
        this.gl = gl;
        this.parts = [];
        this.modelMatrix = LIBS.get_I4(); // This matrix will control the entire Piplup's rotation
        this.initParts();
    }

    initParts() {
        const gl = this.gl;
        // Piplup Colors
        const C = {
            BODY: [0.52, 0.80, 1.00], HEAD: [0.20, 0.38, 0.64], BEAK: [1.00, 0.84, 0.00],
            EYE_W: [1.00, 1.00, 1.00], EYE_P: [0.00, 0.00, 0.00], FEET: [1.00, 0.65, 0.00]
        };

        // Helper function to create a translation matrix using your libs.js functions
        const createTransform = (x, y, z) => {
            const m = LIBS.get_I4();
            LIBS.translateX(m, x);
            LIBS.translateY(m, y);
            LIBS.translateZ(m, z);
            return m;
        };

        // Define parts and their local transformations
        const partDefinitions = [
            // Body and Head
            { geom: Geometry.generateSphere(1, 1.2, 1, 20, 20, C.BODY), trans: LIBS.get_I4()},
            { geom: Geometry.generateSphere(0.8, 0.8, 0.8, 20, 20, C.HEAD), trans: createTransform(0, 1.5, 0)},
            // Eyes
            { geom: Geometry.generateSphere(0.2, 0.2, 0.1, 10, 10, C.EYE_W), trans: createTransform(-0.3, 1.6, 0.7)},
            { geom: Geometry.generateSphere(0.2, 0.2, 0.1, 10, 10, C.EYE_W), trans: createTransform(0.3, 1.6, 0.7)},
            { geom: Geometry.generateSphere(0.1, 0.1, 0.1, 10, 10, C.EYE_P), trans: createTransform(-0.3, 1.6, 0.8)},
            { geom: Geometry.generateSphere(0.1, 0.1, 0.1, 10, 10, C.EYE_P), trans: createTransform(0.3, 1.6, 0.8)},
            // Beak using Elliptic Paraboloid
            { geom: Geometry.generateEllipticParaboloid(0.3, 0.2, 0.5, 20, C.BEAK), trans: (() => {
                    let m = createTransform(0, 1.3, 1.2);
                    LIBS.rotateX(m, LIBS.degToRad(-15));
                    LIBS.rotateY(m, LIBS.degToRad(180));
                    return m;
                })()},
            { geom: Geometry.generateEllipticParaboloid(0.25, 0.15, 0.4, 20, C.BEAK), trans: (() => {
                    let m = createTransform(0, 1.15, 0.7);
                    LIBS.rotateX(m, LIBS.degToRad(5));
                    return m;
                })()},
            // Feet
            { geom: Geometry.generateSphere(0.4, 0.15, 0.5, 10, 10, C.FEET), trans: createTransform(-0.5, -1.2, 0.2)},
            { geom: Geometry.generateSphere(0.4, 0.15, 0.5, 10, 10, C.FEET), trans: createTransform(0.5, -1.2, 0.2)},
            // Hands (Flippers)
            { geom: Geometry.generateSphere(0.2, 0.7, 0.5, 15, 15, C.HEAD), trans: (() => {
                    let m = createTransform(-0.9, 0.3, -0.2);
                    LIBS.rotateZ(m, LIBS.degToRad(20));
                    LIBS.rotateX(m, LIBS.degToRad(-10));
                    return m;
                })()},
            { geom: Geometry.generateSphere(0.2, 0.7, 0.5, 15, 15, C.HEAD), trans: (() => {
                    let m = createTransform(0.9, 0.3, -0.2);
                    LIBS.rotateZ(m, LIBS.degToRad(-20));
                    LIBS.rotateX(m, LIBS.degToRad(-10));
                    return m;
                })()}
        ];

        partDefinitions.forEach(def => {
            const part = new PiplupPart(gl, def.geom);
            part.setTransform(def.trans);
            this.parts.push(part);
        });
    }

    draw(shader) {
        this.parts.forEach(part => {
            part.draw(shader, this.modelMatrix);
        });
    }
}

// --- RENDERER CLASS ---
// Manages the overall WebGL scene, shaders, and render loop.
class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.gl = this.canvas.getContext("webgl", { antialias: true });
        if (!this.gl) throw new Error("WebGL not supported");

        this.shader = this.createShaderProgram();
        this.piplup = new Piplup(this.gl);

        this.viewMatrix = LIBS.get_I4();
        LIBS.translateZ(this.viewMatrix, -12);
        this.projMatrix = LIBS.get_projection(40, this.canvas.width / this.canvas.height, 1, 100);

        this.initInputHandlers();
        this.startRenderLoop();
    }

    createShaderProgram() {
        const gl = this.gl;
        const vsSource = `
            attribute vec3 position;
            attribute vec3 color;
            uniform mat4 Mmatrix, Vmatrix, Pmatrix;
            varying vec3 vColor;
            void main(void) {
                gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.);
                vColor = color;
            }`;
        const fsSource = `
            precision mediump float;
            varying vec3 vColor;
            void main(void) {
                gl_FragColor = vec4(vColor, 1.);
            }`;

        const vs = this.compileShader(vsSource, gl.VERTEX_SHADER);
        const fs = this.compileShader(fsSource, gl.FRAGMENT_SHADER);

        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        gl.useProgram(program);

        const locations = {
            position: gl.getAttribLocation(program, "position"),
            color: gl.getAttribLocation(program, "color"),
            Pmatrix: gl.getUniformLocation(program, "Pmatrix"),
            Vmatrix: gl.getUniformLocation(program, "Vmatrix"),
            Mmatrix: gl.getUniformLocation(program, "Mmatrix")
        };

        gl.enableVertexAttribArray(locations.position);
        gl.enableVertexAttribArray(locations.color);

        return { program, locations };
    }

    compileShader(source, type) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error("Shader compile error: " + gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    initInputHandlers() {
        let drag = false;
        let x_prev, y_prev;
        let dX = 0, dY = 0;
        let THETA = 0, PHI = 0;
        const FRICTION = 0.15;

        this.canvas.onmousedown = (e) => { drag = true; x_prev = e.pageX; y_prev = e.pageY; };
        this.canvas.onmouseup = () => { drag = false; };
        this.canvas.onmouseout = () => { drag = false; };
        this.canvas.onmousemove = (e) => {
            if (!drag) return;
            dX = (e.pageX - x_prev) * 2 * Math.PI / this.canvas.width;
            dY = (e.pageY - y_prev) * 2 * Math.PI / this.canvas.height;
            THETA += dX;
            PHI += dY;
            x_prev = e.pageX;
            y_prev = e.pageY;
        };

        // This function is called every frame to update the Piplup's rotation
        this.updateRotation = () => {
            if (!drag) {
                dX *= (1 - FRICTION);
                dY *= (1 - FRICTION);
                THETA += dX;
                PHI += dY;
            }
            const rotationMatrix = LIBS.get_I4();
            LIBS.rotateY(rotationMatrix, THETA);
            LIBS.rotateX(rotationMatrix, PHI);
            this.piplup.modelMatrix = rotationMatrix;
        };
    }

    startRenderLoop() {
        const gl = this.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clearDepth(1.0);

        const render = () => {
            this.updateRotation();

            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            gl.uniformMatrix4fv(this.shader.locations.Pmatrix, false, this.projMatrix);
            gl.uniformMatrix4fv(this.shader.locations.Vmatrix, false, this.viewMatrix);

            this.piplup.draw(this.shader);

            requestAnimationFrame(render);
        };
        render();
    }
}

// --- START THE APPLICATION ---
window.addEventListener('load', () => {
    new Renderer('myCanvas');
});