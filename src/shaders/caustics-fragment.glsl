uniform sampler2D uTexture;
varying vec2 vUv;
varying vec3 vPosition;
uniform vec3 uLight;
uniform float uIntensity;

void main() {
  vec2 uv = vUv;

  vec3 normalTexture = texture2D(uTexture, uv).rgb;

  vec3 normal = normalize(normalTexture);//get normal value from normalTexture.

  vec3 lightDir = normalize(uLight);

  vec3 ray = refract(lightDir, normal, 1.0 / 1.25);

  vec3 newPos = vPosition.xyz + ray;

  vec3 oldPos = vPosition.xyz;

  float lightArea = length(dFdx(oldPos)) * length(dFdy(oldPos));

  float newLightArea = length(dFdx(newPos)) * length(dFdy(newPos));

  float value = lightArea / newLightArea * 0.2;

  value = clamp(value, 0.0, 1.0) * uIntensity;

  value = value * value;

  if(value > 0.01) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    gl_FragColor = vec4(vec3(value * 10.0), 1.0);
  }
}
