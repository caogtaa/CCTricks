%
% Script to create four demo distance textures
% for use with Green's contour rendering method.
%

% Texture 1, B/W with AA, 1024x1024 pixels
[img, map, alpha] = imread('sword_120x256.png');  % Read from file
alpha = double(alpha);               % Convert to double
%if size(img,3) > 1
%    img = img(:,:,1);            % Convert to grayscale if RGB
%end
% use only alpha channel
img = alpha;
img = img - min(min(img));       % Map darkest black to 0
img = img / max(max(img));       % Map brightest white to 1
dist = makedisttex(img, 120, 256); % No size reduction needed
tgawrite(distquant(dist),'sword_120x256.tga');
tgawrite(img,'sword_120x256_ref.tga');

% Texture 1, B/W with AA, 1024x1024 pixels
img = imread('NPOT_flipper128.png');  % Read from file
img = double(img);
if size(img,3) > 1
    img = img(:,:,1);            % Convert to grayscale if RGB
end

img = img - min(min(img));       % Map darkest black to 0
img = img / max(max(img));       % Map brightest white to 1
dist = makedisttex(img, 100, 128); % No size reduction needed
tgawrite(distquant(dist),'NPOT_flipper128.tga');
tgawrite(img,'NPOT_flipper128_ref.tga');

return;

% Texture 1, B/W with AA, 1024x1024 pixels
img = imread('splash1024.png');  % Read from file
img = double(img);               % Convert to double
if size(img,3) > 1
    img = img(:,:,1);            % Convert to grayscale if RGB
end
img = img - min(min(img));       % Map darkest black to 0
img = img / max(max(img));       % Map brightest white to 1
dist = makedisttex(img, 1024,1024); % No size reduction needed
tgawrite(distquant(dist),'dist1.tga');
tgawrite(img,'ref1.tga');

% Texture 2, B/W with AA, 1024x1024 pixels
img = imread('lisse1024.png');   % Read from file
img = double(img);               % Convert to double
if size(img,3) > 1
    img = img(:,:,1);            % Convert to grayscale if RGB
end
img = img - min(min(img));       % Map darkest black to 0
img = img / max(max(img));       % Map brightest white to 1
dist = makedisttex(img, 1024,1024); % No size reduction needed
tgawrite(distquant(dist),'dist2.tga');
tgawrite(img,'ref2.tga');

% Texture , B/W with AA, 1024x1024 pixels
img = imread('drake1024.png');   % Read from file
img = double(img);               % Convert to double
if size(img,3) > 1
    img = img(:,:,1);            % Convert to grayscale if RGB
end
img = img - min(min(img));       % Map darkest black to 0
img = img / max(max(img));       % Map brightest white to 1
dist = makedisttex(img, 1024,1024); % No size reduction needed
tgawrite(distquant(dist),'dist3.tga');
tgawrite(img,'ref3.tga');

% Texture 4, B/W with AA, 128x128 pixels
img = imread('flipper128.png'); % Read from file
img = double(img);               % Convert to double
if size(img,3) > 1
    img = img(:,:,1);            % Convert to grayscale if RGB
end
img = img - min(min(img));       % Map darkest black to 0
img = img / max(max(img));       % Map brightest white to 1
dist = makedisttex(img, 128,128); % No size reduction needed
tgawrite(distquant(dist),'dist4.tga');
tgawrite(img,'ref4.tga');
