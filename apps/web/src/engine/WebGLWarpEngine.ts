export class WebGLWarpEngine {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private positionBuffer: WebGLBuffer;
  private texCoordBuffer: WebGLBuffer;
  private texture: WebGLTexture;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement) {
    this.width = canvas.width;
    this.height = canvas.height;
    
    const glCanvas = document.createElement('canvas');
    glCanvas.width = this.width;
    glCanvas.height = this.height;
    
    const gl = glCanvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) throw new Error("WebGL not supported");
    this.gl = gl;

    const vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    const fsSource = `
      precision highp float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;
      uniform float u_intensity;
      uniform vec2 u_centerL;
      uniform vec2 u_centerR;
      uniform vec2 u_nose;
      uniform float u_radius;
      uniform float u_aspect;

      void main() {
        vec2 tc = v_texCoord;
        vec2 tcAdj = vec2(tc.x * u_aspect, tc.y);
        vec2 noseAdj = vec2(u_nose.x * u_aspect, u_nose.y);
        vec2 centerLAdj = vec2(u_centerL.x * u_aspect, u_centerL.y);
        vec2 centerRAdj = vec2(u_centerR.x * u_aspect, u_centerR.y);

        // Pinch logic: pull cheeks towards nose. 
        // Inverse mapping: To shrink the face, a point near the cheek should sample from further outside.
        // Therefore we subtract the inward vector.
        
        float distL = distance(tcAdj, centerLAdj);
        if (distL < u_radius) {
            float factor = (1.0 - (distL / u_radius)) * u_intensity;
            // Vector from cheek to nose
            vec2 shift = (u_nose - u_centerL) * factor;
            tc -= shift;
        }

        float distR = distance(tcAdj, centerRAdj);
        if (distR < u_radius) {
            float factor = (1.0 - (distR / u_radius)) * u_intensity;
            vec2 shift = (u_nose - u_centerR) * factor;
            tc -= shift;
        }

        // Clamp to edge to avoid sampling outside
        tc = clamp(tc, 0.0, 1.0);
        gl_FragColor = texture2D(u_image, tc);
      }
    `;

    this.program = this.createProgram(vsSource, fsSource)!;
    this.gl.useProgram(this.program);

    this.positionBuffer = this.gl.createBuffer()!;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1
    ]), this.gl.STATIC_DRAW);

    this.texCoordBuffer = this.gl.createBuffer()!;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
      0, 1,  1, 1,  0, 0,
      0, 0,  1, 1,  1, 0
    ]), this.gl.STATIC_DRAW);

    this.texture = this.gl.createTexture()!;
  }

  private createShader(type: number, source: string) {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error(this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private createProgram(vs: string, fs: string) {
    const vShader = this.createShader(this.gl.VERTEX_SHADER, vs)!;
    const fShader = this.createShader(this.gl.FRAGMENT_SHADER, fs)!;
    const prog = this.gl.createProgram()!;
    this.gl.attachShader(prog, vShader);
    this.gl.attachShader(prog, fShader);
    this.gl.linkProgram(prog);
    return prog;
  }

  public applyWarp(image: HTMLCanvasElement, leftCheek: {x: number, y: number}, rightCheek: {x: number, y: number}, nose: {x: number, y: number}, intensity: number): HTMLCanvasElement {
    this.gl.useProgram(this.program);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);

    const posLoc = this.gl.getAttribLocation(this.program, "a_position");
    this.gl.enableVertexAttribArray(posLoc);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.vertexAttribPointer(posLoc, 2, this.gl.FLOAT, false, 0, 0);

    const texLoc = this.gl.getAttribLocation(this.program, "a_texCoord");
    this.gl.enableVertexAttribArray(texLoc);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.vertexAttribPointer(texLoc, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_intensity"), (intensity / 100.0) * 0.3);
    this.gl.uniform2f(this.gl.getUniformLocation(this.program, "u_centerL"), leftCheek.x, leftCheek.y);
    this.gl.uniform2f(this.gl.getUniformLocation(this.program, "u_centerR"), rightCheek.x, rightCheek.y);
    this.gl.uniform2f(this.gl.getUniformLocation(this.program, "u_nose"), nose.x, nose.y);
    
    const aspect = this.width / this.height;
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_aspect"), aspect);
    
    const faceW = Math.abs((rightCheek.x - leftCheek.x) * aspect);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_radius"), faceW * 0.6);

    this.gl.viewport(0, 0, this.width, this.height);
    this.gl.clearColor(0,0,0,0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

    return this.gl.canvas as HTMLCanvasElement;
  }
}
