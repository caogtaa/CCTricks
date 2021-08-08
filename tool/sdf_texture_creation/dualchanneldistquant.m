function dcdq = dualchanneldistquant(dist)

[h,w,c] = size(dist);

if(c~=1)
    error('Input is not a 1-channel image');
end

% dist is signed
% clamp dist value to [0, 65535]
% store hi 8 bits in R channel
% store lo 8 bits in G channel

arr = uint16(32768 + dist * 256);
arr(arr < 0) = 0;
arr(arr > 65535) = 65535;

res = uint8(zeros(h, w, 3));
res(:,:,1) = uint8(idivide(arr, 256));
res(:,:,2) = uint8(mod(arr, 256));
dcdq = res;

end
