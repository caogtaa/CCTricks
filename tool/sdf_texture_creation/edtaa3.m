% distance = edtaa3(image)
%
% This Matlab MEX function implements the Euclidean distance transform
% by SSED8, a fast sweep-and-update algorithm invented by Per-Erik
% Danielsson in 1980, later improved by Ingemar Ragnemalm and
% published in his PhD dissertation in 1993.
%
% This version is modified to additionally honor anti-aliased edges.
% While regular distance transforms assume a binary image, the input
% to this function may have a 1 pixel wide edge region with values
% between 0 and 1, whereby the distance field will be computed based
% on a sub-pixel estimate of the edge position based on the image
% value at the edge.
%
% This function provides a more accurate estimate of the true
% distance near the edge than edtaa2(), but it is also slower.
%
% The input is a real 2D array. Pixels with value 1 or more are
% "object pixels", pixels in the range 0 to 1 (exclusive) are
% considered edge pixels, and zero or negative pixels are
% considered "background pixels".
% The result is a real 2D array where each number represents the
% Euclidean distance from that pixel to the closest object edge.
%
% Given two output parameters, the function returns the distance
% to the nearest object edge and the linear index of the pixel
% where that edge is located, like the Matlab function bwdist().
%
% [distance, closest] = edtaa3(image)
%
% This function is aimed at fixing the remaining small errors
% in the result of edtaa2(), and it is quite a lot more complex.
% The function edtaa2() is less accurate but significantly faster.
%
% Author: Stefan Gustavson, Linkoping University, 2009-05-15
% (stefan.gustavson@gmail.com)
%
% See also: edt, edtaa2, bwdist
