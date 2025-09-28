// --- UTILITY FOR GEOMETRY ---
const Geometry = {
    // Only generateSphere is needed for this version
    generateSphere: function (a, b, c, stack, step) {
        const vertices = [];
        const faces = [];
        for (let i = 0; i <= stack; i++) {
            for (let j = 0; j <= step; j++) {
                const u = i / stack * Math.PI - (Math.PI / 2);
                const v = j / step * 2 * Math.PI - Math.PI;
                const x = a * Math.cos(v) * Math.cos(u);
                const y = b * Math.sin(u);
                const z = c * Math.sin(v) * Math.cos(u);

                const normal = [x, y, z];
                LIBS.normalize(normal);

                vertices.push(x, y, z, normal[0], normal[1], normal[2]);
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
    }
};


// --- PIPLUP PART CLASS ---
class PiplupPart {
    constructor(gl, geometry, material) {
        this.gl = gl;
        this.geometry = geometry;
        this.material = material; // Store material properties
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

    setTransform(transformMatrix) {
        this.modelMatrix = transformMatrix;
    }

    draw(shader, parentMatrix, viewMatrix) {
        const gl = this.gl;

        const finalModelMatrix = LIBS.multiply(this.modelMatrix, parentMatrix);
        gl.uniformMatrix4fv(shader.locations.Mmatrix, false, finalModelMatrix);

        const normalMatrix = LIBS.inverse(finalModelMatrix);
        LIBS.transpose(normalMatrix, normalMatrix);
        gl.uniformMatrix4fv(shader.locations.Nmatrix, false, normalMatrix);

        gl.uniform3fv(shader.locations.ambientColor, this.material.ambient);
        gl.uniform3fv(shader.locations.diffuseColor, this.material.diffuse);
        gl.uniform3fv(shader.locations.specularColor, this.material.specular);
        gl.uniform1f(shader.locations.shininess, this.material.shininess);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertex);
        gl.vertexAttribPointer(shader.locations.position, 3, gl.FLOAT, false, 4 * 6, 0);
        gl.vertexAttribPointer(shader.locations.normal, 3, gl.FLOAT, false, 4 * 6, 3 * 4);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.faces);
        gl.drawElements(gl.TRIANGLES, this.buffers.faces_length, gl.UNSIGNED_SHORT, 0);
    }
}


// --- PIPLUP CONTAINER CLASS ---
class Piplup {
    constructor(gl) {
        this.gl = gl;
        this.parts = [];
        this.modelMatrix = LIBS.get_I4();
        this.initParts();
    }

    initParts() {
        const gl = this.gl;
        const M = {
            BODY: { ambient: [0.3, 0.5, 0.8], diffuse: [0.52, 0.80, 1.00], specular: [0.7, 0.7, 0.8], shininess: 32.0 },
            HEAD: { ambient: [0.1, 0.2, 0.4], diffuse: [0.20, 0.38, 0.64], specular: [0.5, 0.5, 0.6], shininess: 20.0 },
            BEAK: { ambient: [0.6, 0.4, 0.0], diffuse: [1.00, 0.84, 0.00], specular: [0.9, 0.9, 0.7], shininess: 64.0 },
            EYE_W: { ambient: [0.7, 0.7, 0.7], diffuse: [1.00, 1.00, 1.00], specular: [1.0, 1.0, 1.0], shininess: 128.0 },
            EYE_P: { ambient: [0.0, 0.0, 0.0], diffuse: [0.1, 0.1, 0.1], specular: [0.8, 0.8, 0.8], shininess: 128.0 },
            FEET: { ambient: [0.6, 0.3, 0.0], diffuse: [1.00, 0.65, 0.00], specular: [0.8, 0.7, 0.5], shininess: 16.0 }
        };

        const createTransform = (x, y, z) => {
            const m = LIBS.get_I4();
            LIBS.translateX(m, x); LIBS.translateY(m, y); LIBS.translateZ(m, z);
            return m;
        };

        // UPDATED: Using the simpler sphere-based definitions from piplup.js
        const partDefinitions = [
            { geom: Geometry.generateSphere(1, 1.2, 1, 100, 100), mat: M.BODY, trans: LIBS.get_I4()},
            { geom: Geometry.generateSphere(0.8, 0.8, 0.8, 100, 100), mat: M.HEAD, trans: createTransform(0, 1.5, 0)},
            { geom: Geometry.generateSphere(0.2, 0.2, 0.1, 50, 50), mat: M.EYE_W, trans: createTransform(-0.3, 1.6, 0.7)},
            { geom: Geometry.generateSphere(0.2, 0.2, 0.1, 50, 50), mat: M.EYE_W, trans: createTransform(0.3, 1.6, 0.7)},
            { geom: Geometry.generateSphere(0.1, 0.1, 0.1, 50, 50), mat: M.EYE_P, trans: createTransform(-0.3, 1.6, 0.8)},
            { geom: Geometry.generateSphere(0.1, 0.1, 0.1, 50, 50), mat: M.EYE_P, trans: createTransform(0.3, 1.6, 0.8)},
            { geom: Geometry.generateSphere(0.2, 0.1, 0.4, 50, 50), mat: M.BEAK, trans: createTransform(0, 1.3, 0.8)},
            { geom: Geometry.generateSphere(0.2, 0.1, 0.3, 50, 50), mat: M.BEAK, trans: createTransform(0, 1.15, 0.7)},
            { geom: Geometry.generateSphere(0.4, 0.15, 0.5, 50, 50), mat: M.FEET, trans: createTransform(-0.5, -1.2, 0.2)},
            { geom: Geometry.generateSphere(0.4, 0.15, 0.5, 50, 50), mat: M.FEET, trans: createTransform(0.5, -1.2, 0.2)},
            // Kept the hands from the previous version
            { geom: Geometry.generateSphere(0.2, 0.7, 0.5, 15, 15), mat: M.HEAD, trans: (() => {
                    let m = createTransform(-0.9, 0.3, -0.2); LIBS.rotateZ(m, LIBS.degToRad(-20)); LIBS.rotateX(m, LIBS.degToRad(-10)); return m;
                })()},
            { geom: Geometry.generateSphere(0.2, 0.7, 0.5, 15, 15), mat: M.HEAD, trans: (() => {
                    let m = createTransform(0.9, 0.3, -0.2); LIBS.rotateZ(m, LIBS.degToRad(20)); LIBS.rotateX(m, LIBS.degToRad(-10)); return m;
                })()}
        ];

        partDefinitions.forEach(def => {
            const part = new PiplupPart(gl, def.geom, def.mat);
            part.setTransform(def.trans);
            this.parts.push(part);
        });
    }

    draw(shader, viewMatrix) {
        this.parts.forEach(part => {
            part.draw(shader, this.modelMatrix, viewMatrix);
        });
    }
}


// --- RENDERER CLASS ---
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
            precision mediump float;
            attribute vec3 position;
            attribute vec3 normal;

            uniform mat4 Mmatrix, Vmatrix, Pmatrix, Nmatrix;

            varying vec3 v_Normal;
            varying vec3 v_FragPos;

            void main(void) {
                v_FragPos = (Mmatrix * vec4(position, 1.0)).xyz;
                v_Normal = mat3(Nmatrix) * normal;
                gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.0);
            }`;
        const fsSource = `
            precision mediump float;
            
            varying vec3 v_Normal;
            varying vec3 v_FragPos;

            uniform vec3 lightPos;
            uniform vec3 lightColor;
            
            uniform vec3 ambientColor;
            uniform vec3 diffuseColor;
            uniform vec3 specularColor;
            uniform float shininess;
            
            uniform vec3 viewPos;

            void main(void) {
                vec3 ambient = 0.2 * lightColor * ambientColor;

                vec3 norm = normalize(v_Normal);
                vec3 lightDir = normalize(lightPos - v_FragPos);
                float diff = max(dot(norm, lightDir), 0.0);
                vec3 diffuse = diff * lightColor * diffuseColor;

                vec3 viewDir = normalize(viewPos - v_FragPos);
                vec3 reflectDir = reflect(-lightDir, norm);
                float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
                vec3 specular = spec * lightColor * specularColor;
                
                vec3 result = ambient + diffuse + specular;
                gl_FragColor = vec4(result, 1.0);
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
            normal: gl.getAttribLocation(program, "normal"),
            Pmatrix: gl.getUniformLocation(program, "Pmatrix"),
            Vmatrix: gl.getUniformLocation(program, "Vmatrix"),
            Mmatrix: gl.getUniformLocation(program, "Mmatrix"),
            Nmatrix: gl.getUniformLocation(program, "Nmatrix"),

            lightPos: gl.getUniformLocation(program, "lightPos"),
            lightColor: gl.getUniformLocation(program, "lightColor"),
            viewPos: gl.getUniformLocation(program, "viewPos"),

            ambientColor: gl.getUniformLocation(program, "ambientColor"),
            diffuseColor: gl.getUniformLocation(program, "diffuseColor"),
            specularColor: gl.getUniformLocation(program, "specularColor"),
            shininess: gl.getUniformLocation(program, "shininess"),
        };

        gl.enableVertexAttribArray(locations.position);
        gl.enableVertexAttribArray(locations.normal);

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
        let drag = false, x_prev, y_prev, dX = 0, dY = 0, THETA = 0, PHI = 0;
        const FRICTION = 0.15;

        this.canvas.onmousedown = (e) => { drag = true; x_prev = e.pageX; y_prev = e.pageY; };
        this.canvas.onmouseup = () => { drag = false; };
        this.canvas.onmouseout = () => { drag = false; };
        this.canvas.onmousemove = (e) => {
            if (!drag) return;
            dX = (e.pageX - x_prev) * 2 * Math.PI / this.canvas.width;
            dY = (e.pageY - y_prev) * 2 * Math.PI / this.canvas.height;
            THETA += dX; PHI += dY;
            x_prev = e.pageX; y_prev = e.pageY;
        };

        this.updateRotation = () => {
            if (!drag) {
                dX *= (1 - FRICTION); dY *= (1 - FRICTION);
                THETA += dX; PHI += dY;
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
        gl.clearColor(0.1, 0.15, 0.2, 1.0);
        gl.clearDepth(1.0);

        const render = (time) => {
            this.updateRotation();

            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            const lightPos = [Math.sin(time * 0.001) * 10, 5, 10];
            gl.uniform3fv(this.shader.locations.lightPos, lightPos);
            gl.uniform3fv(this.shader.locations.lightColor, [1.0, 1.0, 1.0]);
            gl.uniform3fv(this.shader.locations.viewPos, [0, 0, 12]);

            gl.uniformMatrix4fv(this.shader.locations.Pmatrix, false, this.projMatrix);
            gl.uniformMatrix4fv(this.shader.locations.Vmatrix, false, this.viewMatrix);

            this.piplup.draw(this.shader, this.viewMatrix);

            requestAnimationFrame(render);
        };
        render(0);
    }
}

// --- START THE APPLICATION ---
window.addEventListener('load', () => {
    new Renderer('myCanvas');
});