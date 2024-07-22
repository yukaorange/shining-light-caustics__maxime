varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;

  vec4 worldPosition = modelMatrix * vec4(position, 1.0);

  vPosition = worldPosition.xyz;//world position of fullscreen quad. fullscreen quad will use in causticPlane.

  vec4 viewPosition = viewMatrix * worldPosition;

  gl_Position = projectionMatrix * viewPosition;

}