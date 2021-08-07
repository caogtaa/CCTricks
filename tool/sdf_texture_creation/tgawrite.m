function tgawrite(img, filename)
% tgawrite(img, filename)
%
% Writes a grayscale, RGB or RGBA image to a TGA file.
% Integer arrays are clipped to uint8 [0,255].
% For floating-point arrays, the range [0,1] is
% mapped to the uint8 range [0,255].
% Only non-paletted grayscale, RGB or RGBA files
% with 8 bits per channel are supported.
%
% This function was written for the single purpose of
% writing TGA files that can be read by GLFW.
% It might not be suitable for general use.
%
% Author: Stefan Gustavson (stefan.gustavson@gmail.com)
% Date: 2009-04-24. This code is in the public domain.
%
% See also: tgaread

[h,w,c] = size(img);

if (c==1)
    if(~isinteger(img))
        img = 256*img;
    end
    ofp = fopen(filename, 'w');
    fwrite(ofp, [0 0 3], 'uint8');
    fwrite(ofp, [0 0], 'uint16');
    fwrite(ofp, [0], 'uint8');
    fwrite(ofp, [0 0 w h], 'uint16');
    fwrite(ofp, [8 0], 'uint8');
    fwrite(ofp, img', 'uint8');
    fclose(ofp);
elseif (c==3)
    img = img(:,:,[3 2 1]); % BGR channel order
    img = permute(img, [3 2 1]); % channel interleave, transpose
    if(~isinteger(img))
        img = 256*img;
    end
    ofp = fopen(filename, 'w');
    fwrite(ofp, [0 0 2], 'uint8');
    fwrite(ofp, [0 0], 'uint16');
    fwrite(ofp, [0], 'uint8');
    fwrite(ofp, [0 0 w h], 'uint16');
    fwrite(ofp, [24 0], 'uint8');
    fwrite(ofp, img, 'uint8');
    fclose(ofp);
elseif (c==4)
    img = img(:,:,[3 2 1 4]); % BGRA channel order
    img = permute(img, [3 2 1]); % channel interleave, transpose
    if(~isinteger(img))
        img = 256*img;
    end
    ofp = fopen(filename, 'w');
    fwrite(ofp, [0 0 2], 'uint8');
    fwrite(ofp, [0 0], 'uint16');
    fwrite(ofp, [0], 'uint8');
    fwrite(ofp, [0 0 w h], 'uint16');
    fwrite(ofp, [32 8], 'uint8');
    fwrite(ofp, img, 'uint8');
    fclose(ofp);
else
    error('Unsupported number of channels in input');
end
