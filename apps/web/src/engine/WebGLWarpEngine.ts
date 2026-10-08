export interface WarpPoint {
  center: { x: number, y: number };
  target: { x: number, y: number };
  radius: number;
  intensity: number;
  mode?: number; // 0.0 = directional, 1.0 = radial bulge (magnify), -1.0 = radial pinch (shrink)
}

export class WebGLWarpEngine {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private positionBuffer: WebGLBuffer;
  private texCoordBuffer: WebGLBuffer;
  private texture: WebGLTexture;
  private hairTexture: WebGLTexture;
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
      uniform sampler2D u_hairMask;
      uniform int u_hasHairMask;
      
      uniform vec2 u_centers[10];
      uniform vec2 u_targets[10];
      uniform float u_radii[10];
      uniform float u_intensities[10];
      uniform float u_modes[10];
      uniform int u_numPoints;
      
      uniform float u_aspect;

      void main() {
        vec2 tc = v_texCoord;
        vec2 tcAdj = vec2(tc.x * u_aspect, tc.y);

        for (int i = 0; i < 10; i++) {
            if (i >= u_numPoints) break;
            
            vec2 cAdj = vec2(u_centers[i].x * u_aspect, u_centers[i].y);
            
            float dist = distance(tcAdj, cAdj);
            if (dist < u_radii[i] && dist > 0.00001) {
                float t = 1.0 - (dist / u_radii[i]);
                // Smooth Hermite interpolation (smoothstep) for C1 continuity to protect background and contours
                float smoothFactor = t * t * (3.0 - 2.0 * t);
                float factor = smoothFactor * u_intensities[i];
                
                vec2 shift = vec2(0.0);
                if (abs(u_modes[i]) < 0.5) {
                    // Directional shift
                    shift = (u_targets[i] - u_centers[i]) * factor;
                } else if (u_modes[i] > 0.5) {
                    // Radial bulge: sample from closer to center (magnifies iris/feature)
                    vec2 dir = (v_texCoord - u_centers[i]);
                    shift = dir * factor;
                } else {
                    // Radial pinch: sample from further away (slims/shrinks feature)
                    vec2 dir = (v_texCoord - u_centers[i]);
                    shift = -dir * factor;
                }
                
                if (u_hasHairMask == 1) {
                    float targetHair = texture2D(u_hairMask, v_texCoord).r;
                    float sampleHair = texture2D(u_hairMask, tc - shift).r;
                    
                    if (sampleHair > 0.5 && targetHair < 0.2) {
                        shift *= 0.0;
                    } else if (sampleHair > targetHair) {
                        shift *= (1.0 - (sampleHair - targetHair));
                    }
                }
                
                tc -= shift;
            }
        }

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
    this.hairTexture = this.gl.createTexture()!;
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

  public applyWarp(image: HTMLCanvasElement, points: WarpPoint[], hairMask?: HTMLCanvasElement): HTMLCanvasElement {
    if (this.width !== image.width || this.height !== image.height) {
      this.width = image.width;
      this.height = image.height;
      const glCanvas = this.gl.canvas as HTMLCanvasElement;
      glCanvas.width = this.width;
      glCanvas.height = this.height;
    }

    this.gl.useProgram(this.program);
    
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.uniform1i(this.gl.getUniformLocation(this.program, "u_image"), 0);

    const hasHairMaskLoc = this.gl.getUniformLocation(this.program, "u_hasHairMask");
    if (hairMask) {
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.hairTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, hairMask);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program, "u_hairMask"), 1);
        this.gl.uniform1i(hasHairMaskLoc, 1);
    } else {
        this.gl.uniform1i(hasHairMaskLoc, 0);
    }

    const posLoc = this.gl.getAttribLocation(this.program, "a_position");
    this.gl.enableVertexAttribArray(posLoc);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.vertexAttribPointer(posLoc, 2, this.gl.FLOAT, false, 0, 0);

    const texLoc = this.gl.getAttribLocation(this.program, "a_texCoord");
    this.gl.enableVertexAttribArray(texLoc);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.vertexAttribPointer(texLoc, 2, this.gl.FLOAT, false, 0, 0);

    const numPoints = Math.min(points.length, 10);
    this.gl.uniform1i(this.gl.getUniformLocation(this.program, "u_numPoints"), numPoints);

    const centers = new Float32Array(20);
    const targets = new Float32Array(20);
    const radii = new Float32Array(10);
    const intensities = new Float32Array(10);
    const modes = new Float32Array(10);

    for (let i = 0; i < numPoints; i++) {
        centers[i*2] = points[i].center.x;
        centers[i*2+1] = points[i].center.y;
        targets[i*2] = points[i].target.x;
        targets[i*2+1] = points[i].target.y;
        radii[i] = points[i].radius;
        intensities[i] = points[i].intensity;
        modes[i] = points[i].mode ?? 0.0;
    }

    this.gl.uniform2fv(this.gl.getUniformLocation(this.program, "u_centers"), centers);
    this.gl.uniform2fv(this.gl.getUniformLocation(this.program, "u_targets"), targets);
    this.gl.uniform1fv(this.gl.getUniformLocation(this.program, "u_radii"), radii);
    this.gl.uniform1fv(this.gl.getUniformLocation(this.program, "u_intensities"), intensities);
    this.gl.uniform1fv(this.gl.getUniformLocation(this.program, "u_modes"), modes);

    const aspect = this.width / this.height;
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_aspect"), aspect);

    this.gl.viewport(0, 0, this.width, this.height);
    this.gl.clearColor(0,0,0,0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

    return this.gl.canvas as HTMLCanvasElement;
  }

  public dispose() {
    if (this.gl) {
      if (this.texture) this.gl.deleteTexture(this.texture);
      if (this.positionBuffer) this.gl.deleteBuffer(this.positionBuffer);
      if (this.texCoordBuffer) this.gl.deleteBuffer(this.texCoordBuffer);
      if (this.program) this.gl.deleteProgram(this.program);
      const ext = this.gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
  }
}
