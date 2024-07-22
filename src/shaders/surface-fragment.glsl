varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vec3 normal = normalize(vNormal);

  normal = normal * 0.5 + 0.5;

  gl_FragColor = vec4(normal, 1.0);
}