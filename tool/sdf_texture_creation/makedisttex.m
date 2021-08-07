function tex = makedisttex(bitmap, width, height)
% tex = makedisttex(bitmap, width, height)
%
% Create texture data for Green's method for distance field
% texturing.
% 'bitmap' is the AA binary input image, 'width' and 'height'
% are the horizontal and vertical resolution of the output
% texture array 'tex'. The output image can be of the same
% size as the input image with good results. More accurate
% results will be  returned if the input resolution is 2
% to 4 times higher than the output resolution, but the
% gain in quality is marginal. The aspect ratio should be
% preserved from input to output.
%
% The conversion uses a modified Euclidean distance transform.
% See accompanying documentation for details.
%
% The output resolution determines the maximum detail level
% that can be reproduced. Features thinner than one texel 
% can not be represented, sharp corners will be rounded
% off to  a curvature radius of about the size of one half
% texel and contours with strong curvature will be distorted.
%
% Author: Stefan Gustavson ITN-LiTH (stegu@itn.liu.se)
% Date: 2009-05-21. This code is in the public domain.


% Make sure the input image is a double 1-channel array
bitmap = double(bitmap(:,:,1));
[h,w] = size(bitmap);

% Perform Euclidean distance transform.
% Matlab's BWDIST function is very similar,
% but does not handle anti-aliased edges
% and would do a terrible job here.
% The function 'edtaa4' is a custom MEX function,
% which you need to compile with 'mex edtaa4.c'.

outside = edtaa3(bitmap); % Transform background (0's)

inside = edtaa3(1-bitmap); % Transform foreground (1's)

distmap = outside - inside; % Bipolar distance field

% Free up some memory - these two arrays are large
clear outside inside;

distmap = imresize(distmap, [height, width], 'bilinear');

% Rescale the offset value to make one unit match the output texel size.
% If the aspect ratio is not preserved, this will be wrong.
% (The rescaling *can* be done right even if the aspect ratio is changed.)
tex = -distmap * height/h; % 'D' coefficient

end
