function distq = distquant(dist)
% distq = distquant(dist)
%
% Quantize a distance map texture for 8-bit storage.
% The encoding is distq = 128 + dist * 16, with
% values clamped to the range [0,255].
%
% Author: Stefan Gustavson ITN-LiTH (stegu@itn.liu.se)
% Date: 2009-05-21. This code is in the public domain.

[h,w,c] = size(dist);

if(c~=1)
    error('Input is not a 1-channel image');
end

% Offset the quantized values to be representable
% in uint8 format, and store them in an RGBA image
distq = uint8(128 + dist * 16);
distq(distq<0) = 0;
distq(distq>255) = 255;
distq = uint8(distq);

end
