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
     * Generates a blunted, beak-like shape.
     * @param {number} width - Max width (x-axis).
     * @param {number} thickness - Max thickness (y-axis).
     * @param {number} length - The length of the beak (z-axis).
     * @param {number} segments - The number of segments for resolution.
     * @param {Array<number>} color - The RGB color array.
     * @returns {{vertices: Array<number>, faces: Array<number>}}
     */
    generateBeak: function(width, thickness, length, segments, color) {
        const vertices = [];
        const faces = [];

        // Tip of the beak
        vertices.push(0, 0, 0, color[0], color[1], color[2]);

        // Build the beak with circular cross-sections
        for (let i = 1; i <= segments; i++) {
            const t = i / segments; // Parameter from 0 to 1

            // Use sqrt(t) to make the beak fatter at the base and blunter at the tip
            const radiusScale = Math.sqrt(t);
            const currentZ = -length * t; // Move along the negative Z-axis

            for (let j = 0; j < segments; j++) {
                const theta = (j / segments) * 2 * Math.PI;
                const x = width * radiusScale * Math.cos(theta);
                const y = thickness * radiusScale * Math.sin(theta);
                vertices.push(x, y, currentZ, color[0], color[1], color[2]);
            }
        }

        // Create faces for the tip
        for (let j = 1; j <= segments; j++) {
            faces.push(0, j, (j % segments) + 1);
        }

        // Create faces for the sides
        for (let i = 0; i < segments - 1; i++) {
            const ring1_start = 1 + i * segments;
            const ring2_start = 1 + (i + 1) * segments;
            for (let j = 0; j < segments; j++) {
                const p1 = ring1_start + j;
                const p2 = ring1_start + ((j + 1) % segments);
                const p3 = ring2_start + j;
                const p4 = ring2_start + ((j + 1) % segments);
                faces.push(p1, p3, p2, p2, p3, p4);
            }
        }

        return { vertices, faces };
    },

    generateTubeFromSpline: function(controlPoints, segments, radius, radialSegments, color) {
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

                // Color
                vertices.push(color[0], color[1], color[2]);
                // vertices.push(j / radialSegments, i / splinePoints.length, 0.5); // color
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
            BODY: [0.52, 0.80, 1.00], HEAD: [0.20, 0.38, 0.64], BEAK: [1.00, 0.84, 0.00], CAPE: [0.24, 0.42, 0.96],
            EYE_W: [1.00, 1.00, 1.00], BLACK: [0.00, 0.00, 0.00], FEET: [1.00, 0.65, 0.00], WHITE: [1.00, 1.00, 1.00]
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
            // Body
            { geom: Geometry.generateSphere(0.8, 1.1, 1, 20, 20, C.BODY), trans: LIBS.get_I4()},

            // Head
            { geom: Geometry.generateSphere(0.8, 0.8, 0.8, 20, 20, C.HEAD), trans: createTransform(0, 1.5, 0)},

            { geom: Geometry.generateSphere(0.6, 0.6, 0.6, 50, 50, C.BODY), trans: createTransform(-0.10, 1.52, 0.25)},
            { geom: Geometry.generateSphere(0.6, 0.6, 0.6, 50, 50, C.BODY), trans: createTransform(0.10, 1.52, 0.25)},
            // Eyes
            { geom: Geometry.generateSphere(0.1, 0.2, 0.1, 10, 10, C.BLACK), trans: createTransform(-0.3, 1.6, 0.80)},
            { geom: Geometry.generateSphere(0.05, 0.05, 0.05, 10, 10, C.WHITE), trans: createTransform(-0.3, 1.7, 0.85)},

            { geom: Geometry.generateSphere(0.1, 0.2, 0.1, 10, 10, C.BLACK), trans: createTransform(0.3, 1.6, 0.80)},
            { geom: Geometry.generateSphere(0.05, 0.05, 0.05, 10, 10, C.WHITE), trans: createTransform(0.3, 1.7, 0.85)},
            // Beak using the new generateBeak function
            { geom: Geometry.generateBeak(0.3, 0.2, 0.6, 15, C.BEAK), trans: (() => {
                    let m = createTransform(0, 1.3, 1.1);
                    LIBS.rotateX(m, LIBS.degToRad(15));
                    return m;
                })()},
            { geom: Geometry.generateBeak(0.25, 0.15, 0.5, 15, C.BEAK), trans: (() => {
                    let m = createTransform(0, 1.25, 1);
                    LIBS.rotateX(m, LIBS.degToRad(5));
                    return m;
                })()},
            // Feet
            { geom: Geometry.generateSphere(0.4, 0.15, 0.5, 10, 10, C.FEET), trans: createTransform(-0.5, -1.2, 0.2)},
            { geom: Geometry.generateSphere(0.4, 0.15, 0.5, 10, 10, C.FEET), trans: createTransform(0.5, -1.2, 0.2)},
            // Hands (Flippers)
            { geom: Geometry.generateSphere(0.2, 0.7, 0.5, 15, 15, C.HEAD), trans: (() => {
                    let m = createTransform(-0.9, 0.3, -0.2);
                    LIBS.rotateZ(m, LIBS.degToRad(-20));
                    LIBS.rotateX(m, LIBS.degToRad(-10));
                    return m;
                })()},
            { geom: Geometry.generateSphere(0.18, 0.85, 0.48, 15, 15, C.BODY), trans: (() => {
                    let m = createTransform(-0.9, 0.15, -0.2);
                    LIBS.rotateZ(m, LIBS.degToRad(-20));
                    LIBS.rotateX(m, LIBS.degToRad(-10));
                    return m;
                })()},
            { geom: Geometry.generateSphere(0.2, 0.7, 0.5, 15, 15, C.HEAD), trans: (() => {
                    let m = createTransform(0.9, 0.3, -0.2);
                    LIBS.rotateZ(m, LIBS.degToRad(20));
                    LIBS.rotateX(m, LIBS.degToRad(-10));
                    return m;
                })()},
            // Cape
            { geom: Geometry.generateTubeFromSpline(
                    // Define control points for the curve's path
                    [
                        [0.0, 0.0, -0.9],   // Start point on the lower back
                        [0.0, 0.05, -1.8],
                        [0.0, -0.2, -1.3], // First curve point
                        [0.0, -0.4, -2.0],  // Second curve point
                        [0.0, -0.7, -1.5]   // End point, slightly flared out
                    ],
                    100, // Segments for smoothness
                    0.15, // Radius of the tube (thickness of the cape)
                    20,   // Radial segments
                    [0.20, 0.38, 0.64], // Color
                ),
                // We don't need a separate transform since the points are in world space relative to the body
                trans: createTransform(0, 0, 0.5)},
            { geom: Geometry.generateSphere(0.7, 0.3, 0.6, 20, 20, C.HEAD), trans: (() => {
                    let m = createTransform(0.3, 0.8, 0.4);
                    LIBS.rotateY(m, LIBS.degToRad(-60));
                    LIBS.rotateZ(m, LIBS.degToRad(-30));
                    return m;
                })()},
            { geom: Geometry.generateSphere(0.7, 0.3, 0.6, 20, 20, C.HEAD), trans: (() => {
                    let m = createTransform(-0.3, 0.8, 0.4);
                    // LIBS.rotateX(m, LIBS.degToRad(60))
                    LIBS.rotateY(m, LIBS.degToRad(60));
                    LIBS.rotateZ(m, LIBS.degToRad(30));
                    return m;
                })()},
            { geom: Geometry.generateSphere(1, 1.2, 0.4, 20, 20, C.HEAD), trans: (() => {
                    let m = createTransform(0, 0.1, -0.7);
                    LIBS.rotateX(m, LIBS.degToRad(20))
                    // LIBS.rotateY(m, LIBS.degToRad(60));
                    // LIBS.rotateZ(m, LIBS.degToRad(30));
                    return m;
                })()},
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