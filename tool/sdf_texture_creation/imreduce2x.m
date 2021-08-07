function ret = imreduce2x(img)
% smallimage = imreduce2x(image)
%
% Reduce an image to 50% size, using a strict box filter.
% This routine is designed for creating antialiased input
% images for the custom function edtaa().
%
% Author: Stefan Gustavson ITN-LiTH (stegu@itn.liu.se) 2009-04-15
% This code is in the public domain.

[h,w]=size(img);
imgclass = class(img);

if(isinteger(img))
    img = int32(img); % Avoid overflow in shorter integer types
end

if(mod(h,2) == 1)
  warning('Uneven number of rows in input, cropping bottom row');
img=img(1:h-1,:,:);
end

if(mod(w,2) == 1)
  warning('Uneven number of columns in input, cropping rightmost column');
img=img(:,1:w-1,:);
end

[h,w]=size(img); % Size may have changed above

% Reduce along columns
tmp = img(1:2:h,:,:) + img(2:2:h,:,:);

% Reduce along rows and normalize
ret = (tmp(:,1:2:w,:) + tmp(:,2:2:w,:)) / 4;

ret = cast(ret, imgclass);

end
