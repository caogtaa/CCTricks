// Note: 这是一份文件备份，需要拷贝到以下目录。拷贝后如果shader依然报错，需要重启Cocos Creator
// C:\CocosDashboard_1.0.12\resources\.editors\Creator\2.4.0\resources\engine\cocos2d\renderer\build\chunks
// 如果用了自定义引擎，放在对应engine工程下

uniform SDFARGS {
  vec2 texSize;
  vec2 texStep;
  float maxDist;
};

#if SDF_HI_RES
  // use EDTAA distance texture
  #if SDF_DUAL_CHANNEL
  // use EDTAA dual 8-bit channel distance texture
  float GetD(sampler2D texture, vec2 st) {
    // Scale texcoords to range ([0,texw], [0,texh])
    vec2 uv = st.xy * texSize;

    // Compute texel-local (u,v) coordinates for the four closest texels
    vec2 uv00 = floor(uv - vec2(0.5)); // Lower left corner of lower left texel
    vec2 uvlerp = uv - uv00 - vec2(0.5); // Texel-local lerp blends [0,1]

    // vec3 onestep = vec3(0.5 * onestepu, 0.5 * onestepv, 0.);   // 偏移0.5个单位，有可能因为精度问题导致采样点错误
    vec4 onestep = vec4(texStep, 0., 0.5);

    // Center st00 on lower left texel and rescale to [0,1] for texture lookup
    vec2 st00 = (uv00  + onestep.ww) * texStep.xy;

    // Compute g_u, g_v, D coefficients from four closest 8-bit RGBA texels
    // 注意读取的是A、R通道
    vec2 rawtex00 = texture2D(texture, st00).ar;
    vec2 rawtex10 = texture2D(texture, st00 + onestep.xz).ar;
    vec2 rawtex01 = texture2D(texture, st00 + onestep.zy).ar;
    vec2 rawtex11 = texture2D(texture, st00 + onestep.xy).ar;

    // decode r & g channel by (r*256+g)
    // #define DECODE_DUAL_8(raw)  raw.r = raw.g * 0.00390625 + raw.r;
    #define DECODE_DUAL_8(raw)  raw.r = raw.r * 256. + raw.g
    DECODE_DUAL_8(rawtex00);
    DECODE_DUAL_8(rawtex10);
    DECODE_DUAL_8(rawtex01);
    DECODE_DUAL_8(rawtex11);

    vec2 D00_10 = vec2(rawtex00.r, rawtex10.r);
    vec2 D01_11 = vec2(rawtex01.r, rawtex11.r);

    // Interpolate along v
    vec2 D0_1 = mix(D00_10, D01_11, uvlerp.y);
    // Interpolate along u
    float D = mix(D0_1.x, D0_1.y, uvlerp.x);
    return D - 128.;    // dist(edge) = 0
  }
  #else
  float GetD(sampler2D texture, vec2 st) {
    float D = texture2D(texture, st).a;
    D = 16.0 * (D - 0.5);   // single 8-bit channel
    return D;
  }
  #endif  // end SDF_DUAL_CHANNEL
#else
  // use EDT low res distance texture
  float GetD(sampler2D texture, vec2 st) {
    float D = texture2D(texture, st).a;
    // map [0, 1] to [-maxDist, maxDist]
    return (D * 2. - 1.) * maxDist;
  }
#endif  // end SDF_HI_RES