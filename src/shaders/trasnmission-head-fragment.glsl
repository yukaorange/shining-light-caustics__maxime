uniform float chromaticAberration;
uniform float anisotropicBlur;
uniform float time;
uniform float distortion;
uniform float distortionScale;
uniform float temporalDistortion;
uniform sampler2D buffer;

vec3 random3(vec3 c) {
  float j = 4096.0 * sin(dot(c, vec3(17.0, 59.4, 15.0)));
  vec3 r;
  r.z = fract(512.0 * j);
  j *= .125;
  r.x = fract(512.0 * j);
  j *= .125;
  r.y = fract(512.0 * j);
  return r - 0.5;
}

float seed = 0.0;
uint hash(uint x) {
  x += (x << 10u);
  x ^= (x >> 6u);
  x += (x << 3u);
  x ^= (x >> 11u);
  x += (x << 15u);
  return x;
}

        // Compound versions of the hashing algorithm I whipped together.
uint hash(uvec2 v) {
  return hash(v.x ^ hash(v.y));
}
uint hash(uvec3 v) {
  return hash(v.x ^ hash(v.y) ^ hash(v.z));
}
uint hash(uvec4 v) {
  return hash(v.x ^ hash(v.y) ^ hash(v.z) ^ hash(v.w));
}

        // Construct a float with half-open range [0:1] using low 23 bits.
        // All zeroes yields 0.0, all ones yields the next smallest representable value below 1.0.
float floatConstruct(uint m) {
  const uint ieeeMantissa = 0x007FFFFFu; // binary32 mantissa bitmask
  const uint ieeeOne = 0x3F800000u; // 1.0 in IEEE binary32
  m &= ieeeMantissa;                     // Keep only mantissa bits (fractional part)
  m |= ieeeOne;                          // Add fractional part to 1.0
  float f = uintBitsToFloat(m);       // Range [1:2]
  return f - 1.0;                        // Range [0:1]
}

        // Pseudo-random value in half-open range [0:1].
float random(float x) {
  return floatConstruct(hash(floatBitsToUint(x)));
}
float random(vec2 v) {
  return floatConstruct(hash(floatBitsToUint(v)));
}
float random(vec3 v) {
  return floatConstruct(hash(floatBitsToUint(v)));
}
float random(vec4 v) {
  return floatConstruct(hash(floatBitsToUint(v)));
}

float rand() {
  float result = random(vec3(gl_FragCoord.xy, seed));
  seed += 1.0;
  return result;
}

const float F3 = 0.3333333;
const float G3 = 0.1666667;

float snoise(vec3 p) {
  vec3 s = floor(p + dot(p, vec3(F3)));
  vec3 x = p - s + dot(s, vec3(G3));
  vec3 e = step(vec3(0.0), x - x.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);
  vec3 x1 = x - i1 + G3;
  vec3 x2 = x - i2 + 2.0 * G3;
  vec3 x3 = x - 1.0 + 3.0 * G3;
  vec4 w, d;
  w.x = dot(x, x);
  w.y = dot(x1, x1);
  w.z = dot(x2, x2);
  w.w = dot(x3, x3);
  w = max(0.6 - w, 0.0);
  d.x = dot(random3(s), x);
  d.y = dot(random3(s + i1), x1);
  d.z = dot(random3(s + i2), x2);
  d.w = dot(random3(s + 1.0), x3);
  w *= w;
  w *= w;
  d *= w;
  return dot(d, vec4(52.0));
}

float snoiseFractal(vec3 m) {
  return 0.5333333 * snoise(m) + 0.2666667 * snoise(2.0 * m) + 0.1333333 * snoise(4.0 * m) + 0.0666667 * snoise(8.0 * m);
}