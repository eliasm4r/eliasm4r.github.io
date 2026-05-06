// inspired by https://x.com/XorDev and https://x.com/lamps_apple
(function () {
    const canvas = document.getElementById('glcanvas');
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
        alert('WebGL not supported');
        return;
    }

    const vsSource = `
        attribute vec2 a_position;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `;

    const fsSource = `
        precision mediump float;
        uniform float t;
        uniform vec2 r;

        vec2 myTanh(vec2 x) {
          vec2 ex = exp(x);
          vec2 emx = exp(-x);
          return (ex - emx) / (ex + emx);
        }

        void main() {
          vec4 o_bg = vec4(0.0);
          vec4 o_anim = vec4(0.0);

          {
            vec2 p_img = (gl_FragCoord.xy * 2.0 - r) / r.y * mat2(1.0, -1.0, 1.0, 1.0);
            vec2 l_val = myTanh(p_img * 5.0 + 2.0);
            l_val = min(l_val, l_val * 3.0);
            vec2 clamped = clamp(l_val, -2.0, 0.0);
            float diff_y = clamped.y - l_val.y;
            float safe_px = abs(p_img.x) < 0.001 ? 0.001 : p_img.x;
            float term = (0.1 - max(0.01 - dot(p_img, p_img) / 200.0, 0.0) * (diff_y / safe_px))
                         / abs(length(p_img) - 0.7);
            o_bg += vec4(term);
            o_bg *= max(o_bg, vec4(0.0));
          }

          {
            vec2 p_anim = (gl_FragCoord.xy * 2.0 - r) / r.y / 0.7;
            vec2 d = vec2(-1.0, 1.0);
            float denom = 0.1 + 5.0 / dot(5.0 * p_anim - d, 5.0 * p_anim - d);
            vec2 c = p_anim * mat2(1.0, 1.0, d.x / denom, d.y / denom);
            vec2 v = c;
            v *= mat2(cos(log(length(v)) + t * 0.2 + vec4(0.0, 33.0, 11.0, 0.0))) * 5.0;
            vec4 animAccum = vec4(0.0);
            for (int i = 1; i <= 9; i++) {
              float fi = float(i);
              animAccum += sin(vec4(v.x, v.y, v.y, v.x)) + vec4(1.0);
              v += 0.7 * sin(vec2(v.y, v.x) * fi + t) / fi + 0.5;
            }
              vec4 animTerm = 1.0 - exp(-exp(c.x * vec4(0.6, -0.4, -1.0, 0.0))
                              / animAccum
                              / (0.1 + 0.1 * pow(length(sin(v / 0.3) * 0.2 + c * vec2(1.0, 2.0)) - 1.0, 2.0))
                              / (1.0 + 7.0 * exp(0.3 * c.y - dot(c, c)))
                              / (0.03 + abs(length(p_anim) - 0.7)) * 0.2);
            float animGray = dot(animTerm.rgb, vec3(0.3333));
            o_anim += vec4(vec3(animGray), 1.0);
          }

          vec4 finalColor = mix(o_bg, o_anim, 0.5) * 1.5;
          finalColor = clamp(finalColor, 0.0, 1.0);
          gl_FragColor = finalColor;
        }
      `;

    function createShader(glContext, type, source) {
        const shader = glContext.createShader(type);
        glContext.shaderSource(shader, source);
        glContext.compileShader(shader);
        if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
            console.error('Shader compile failed with: ' + glContext.getShaderInfoLog(shader));
            glContext.deleteShader(shader);
            return null;
        }
        return shader;
    }

    function createProgram(glContext, vertexSource, fragmentSource) {
        const vertexShader = createShader(glContext, glContext.VERTEX_SHADER, vertexSource);
        const fragmentShader = createShader(glContext, glContext.FRAGMENT_SHADER, fragmentSource);
        if (!vertexShader || !fragmentShader) return null;

        const program = glContext.createProgram();
        glContext.attachShader(program, vertexShader);
        glContext.attachShader(program, fragmentShader);
        glContext.linkProgram(program);
        if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
            console.error('Program failed to link: ' + glContext.getProgramInfoLog(program));
            glContext.deleteProgram(program);
            return null;
        }
        return program;
    }

    const program = createProgram(gl, vsSource, fsSource);
    if (!program) return;

    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const timeLocation = gl.getUniformLocation(program, 't');
    const resolutionLocation = gl.getUniformLocation(program, 'r');

    const vertices = new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }

    window.addEventListener('resize', resize);
    resize();

    const startTime = performance.now();

    function render() {
        const currentTime = performance.now();
        const delta = (currentTime - startTime) / 1000;
        gl.uniform1f(timeLocation, delta);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
})();
