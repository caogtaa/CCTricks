function img = tgaread(filename)
% img = tgaread(filename)
%
% Reads a grayscale, RGB or RGBA image from a TGA file.
% The return argument is of type uint8.
% Only non-paletted grayscale, RGB or RGBA files
% with 8 bits per channel are supported.
% The seldom used h/v flip bits are ignored.
%
% This function was written for the single purpose of
% reading TGA files written by tgawrite().
% It might not be suitable for general use.
%
% Author: Stefan Gustavson (stefan.gustavson@gmail.com)
% Date: 2009-04-24. This code is in the public domain.
%
% See also: tgawrite

ifp = fopen(filename, 'r');

% Read TGA header (and ignore some of it)
dummy = fread(ifp, 2, '*uint8');
filetype = fread(ifp, 1, 'uint8=>double');
dummy = fread(ifp, 2, '*uint16');
dummy = fread(ifp, 1, '*uint8');
dummy = fread(ifp, 2, '*uint16');
w = fread(ifp, 1, 'uint16=>double');
h = fread(ifp, 1, 'uint16=>double');
nbits = fread(ifp, 1, 'uint8=>double');
flags = fread(ifp, 1, 'uint8=>double');

if(filetype == 3) % grayscale
    img = fread(ifp, w*h, '*uint8');
    img = reshape(img, [h w])'; % Reshape and transpose
elseif(filetype == 2)
    if(nbits == 24)
        img = fread(ifp, w*h*3, '*uint8');
        img = reshape(img, [3 w h]);
        img = permute(img, [3 2 1]); % channel de-interleave, transpose
        img = img(:,:,[3 2 1]); % BGR to RGB channel order
    elseif(nbits==32)
        img = fread(ifp, w*h*4, '*uint8');
        img = reshape(img, [4 w h]);
        img = permute(img, [3 2 1]); % channel de-interleave, transpose
        img = img(:,:,[3 2 1 4]); % BGRA to RGBA channel order
    else
        error('Unsupported bit depth in TGA file');
    end
else
    error('Unsupported TGA file type');
end

fclose(ifp);

end
