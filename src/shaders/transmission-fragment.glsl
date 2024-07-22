
          // Improve the refraction to use the world pos
material.transmission = _transmission;
material.transmissionAlpha = 1.0;
material.thickness = thickness;
material.attenuationDistance = attenuationDistance;
material.attenuationColor = attenuationColor;
          #ifdef USE_TRANSMISSIONMAP
material.transmission *= texture2D(transmissionMap, vUv).r;
          #endif
          #ifdef USE_THICKNESSMAP
material.thickness *= texture2D(thicknessMap, vUv).g;
          #endif

vec3 pos = vWorldPosition;
vec3 v = normalize(cameraPosition - pos);
vec3 n = inverseTransformDirection(normal, viewMatrix);
vec3 transmission = vec3(0.0);
float transmissionR, transmissionB, transmissionG;
float randomCoords = rand();
float thickness_smear = thickness * max(pow(roughnessFactor, 0.33), anisotropicBlur);
vec3 distortionNormal = vec3(0.0);
vec3 temporalOffset = vec3(time, - time, - time) * temporalDistortion;
if(distortion > 0.0) {
distortionNormal = distortion * vec3(snoiseFractal(vec3((pos * distortionScale + temporalOffset))), snoiseFractal(vec3(pos.zxy * distortionScale - temporalOffset)), snoiseFractal(vec3(pos.yxz * distortionScale + temporalOffset)));
}
for(float i = 0.0;
i < {
samples }
.0;
i ++) {
vec3 sampleNorm = normalize(n + roughnessFactor * roughnessFactor * 2.0 * normalize(vec3(rand() - 0.5, rand() - 0.5, rand() - 0.5)) * pow(rand(), 0.33) + distortionNormal);
transmissionR = getIBLVolumeRefraction(sampleNorm, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90, pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness + thickness_smear * (i + randomCoords) / float({
samples }
), material.attenuationColor, material.attenuationDistance).r;
transmissionG = getIBLVolumeRefraction(sampleNorm, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90, pos, modelMatrix, viewMatrix, projectionMatrix, material.ior * (1.0 + chromaticAberration * (i + randomCoords) / float({
samples }
)), material.thickness + thickness_smear * (i + randomCoords) / float({
samples }
), material.attenuationColor, material.attenuationDistance).g;
transmissionB = getIBLVolumeRefraction(sampleNorm, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90, pos, modelMatrix, viewMatrix, projectionMatrix, material.ior * (1.0 + 2.0 * chromaticAberration * (i + randomCoords) / float({
samples }
)), material.thickness + thickness_smear * (i + randomCoords) / float({
samples }
), material.attenuationColor, material.attenuationDistance).b;
transmission.r += transmissionR;
transmission.g += transmissionG;
transmission.b += transmissionB;
}
transmission /= {
samples }
.0;
totalDiffuse = mix(totalDiffuse, transmission.rgb, material.transmission);