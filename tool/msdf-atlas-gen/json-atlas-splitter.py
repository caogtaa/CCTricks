'''
Author: GT<caogtaa@gmail.com>
Date: 2020-12-24 11:14:35
LastEditors: GT<caogtaa@gmail.com>
LastEditTime: 2021-08-28 17:10:57
'''
import os
import shutil
import cv2
import codecs
import json
import numpy as np
import copy
import fire
from enum import IntEnum
from os import mkdir, path, walk

cur_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.join(cur_dir, os.pardir, os.pardir)

class Splitter(object):
	'''break atlas into standalone files'''

	def list_png_files(self, dir, output):
		root, sub_dirs, file_names = next(walk(dir))
		output.extend([os.path.join(root, x) for x in file_names if os.path.splitext(x)[1] == '.png'])
		for sub_dir in sub_dirs:
			self.list_png_files(os.path.join(root, sub_dir), output)

	def dilate_dir(self, dir):
		# files = []
		# for (dir_path, dir_names, file_names) in walk(dir):
		# 	files.extend(file_names)

		file_paths = []
		self.list_png_files(dir, file_paths)
		print('\n'.join(file_paths))

		for file_path in file_paths:
			self.dilate(file_path, file_path)

	def dilate(self, input_path, output_path):
		print("[DILATOR] Dilating %s" % input_path)

		# to support Unicode path, do not use cv2.imread directly
		origin_data = cv2.imdecode(
			np.fromfile(input_path, dtype=np.uint8),
			cv2.IMREAD_UNCHANGED)

		# origin_data = cv2.imread(input_path, -1)
		row, col, channel = origin_data.shape
		if channel == 3:
			# do not process if image has no alpha channel
			print("[DILATOR] Texture %s has no alpha channel, ignore" % input_path)
			return

		result = copy.deepcopy(origin_data)
		
		for i in range(0, row):
			for k in range(0, col):
				color = origin_data[i][k]
				if color[3] >= 3:
					# alpha already larger than threshold
					continue

				# pick colors from 8 directions, ignore colors whose alpha < 30
				# 这么做对同一张图重复扩边不会使扩边增长
				r = 0
				g = 0
				b = 0
				count = 0
				for x in range(-1, 2):
					i_x = i + x
					if i_x < 0 or i_x >= row:
						continue

					for y in range(-1, 2):
						if x == 0 and y == 0:
							# ignore center point
							continue

						k_y = k + y
						if k_y < 0 or k_y >= col:
							continue

						c2 = origin_data[i_x][k_y]
						if c2[3] < 30:
							continue

						# this color is considerable
						count += 1
						r += c2[0]
						g += c2[1]
						b += c2[2]
				# end 8 directions check

				if count > 0:
					# use average color from neighbors
					# alpha = 3
					out = result[i][k]
					out[0] = r / count
					out[1] = g / count
					out[2] = b / count
					out[3] = 3

					# test code (blue outline) (BRG mode)
					# out[0] = 255
					# out[1] = 0
					# out[2] = 0
					# out[3] = 128
		
		old_size = os.path.getsize(input_path)

		# to support Unicode path, do not use cv2.imwrite directly
		# cv2.imwrite(output_path, result, [cv2.IMWRITE_PNG_COMPRESSION, 9])
		is_success, result_buf = cv2.imencode(".png", result, [cv2.IMWRITE_PNG_COMPRESSION, 9])
		if is_success:
			result_buf.tofile(output_path)
			print("[DILATOR] Dilate '%s'->'%s' finished" % (input_path, output_path))

			new_size = os.path.getsize(output_path)
			print("[DILATOR] After dialtion file size %sK -> %sK" % (old_size / 1000, new_size / 1000))
		else:
			print("[DIALTOR] Encode image %s failed" % input_path)

	def for_8_dirs(self, img_data, pred, dir_cb):
		row, col, channel = img_data.shape
		# 遍历图片，将遮罩的边缘r通道标红
		for i in range(0, row):
			for k in range(0, col):
				color_c = img_data[i][k]
				if not pred(color_c):
					continue

				for x in range(-1, 2):
					i_x = i + x
					if i_x < 0 or i_x >= row:
						continue

					for y in range(-1, 2):
						if x == 0 and y == 0:
							# ignore center point
							continue

						k_y = k + y
						if k_y < 0 or k_y >= col:
							continue

						color_dir = img_data[i_x][k_y]
						dir_cb(color_c, color_dir)

	def sdf_bfs(self, img_data):
		row, col, channel = img_data.shape

		visited = np.zeros(shape=(row, col), dtype=np.uint8)
		qu = np.zeros(shape=(row * col, 2), dtype=np.uint16)		# qu[k] = (x, y)
		qlen = 0

		for i in range(0, row):
			for k in range(0, col):
				color_c = img_data[i][k]
				if color_c[2] > 0:
					# has red component, record it
					visited[i][k] = 1
					qu[qlen][0] = i
					qu[qlen][1] = k
					qlen += 1

		index = 0		# iterator
		while index < qlen:
			pos = qu[index]
			i = pos[0]
			k = pos[1]
			for x in range(-1, 2):
				i_x = i + x
				if i_x < 0 or i_x >= row:
					continue

				for y in range(-1, 2):
					if x == 0 and y == 0:
						# ignore center point
						continue

					k_y = k + y
					if k_y < 0 or k_y >= col:
						continue

					if img_data[i_x][k_y][3] <= 3:
						# transparent pixel, means not inside mask
						continue

					if visited[i_x][k_y] == 1:
						# already visited
						continue

					r_v = img_data[i][k][2]
					if r_v == 255:
						img_data[i_x][k_y][2] = 255
					else:
						img_data[i_x][k_y][2] = r_v + 1

					visited[i_x][k_y] = 1
					qu[qlen][0] = i_x
					qu[qlen][1] = k_y
					qlen += 1

			index += 1

		# write back to img_data
		vvv = True

	def sdf(self, input_path, output_path):
		print("[DILATOR] Calculate SDF %s" % input_path)

		# to support Unicode path, do not use cv2.imread directly
		origin_data = cv2.imdecode(
			np.fromfile(input_path, dtype=np.uint8),
			cv2.IMREAD_UNCHANGED)

		# origin_data = cv2.imread(input_path, -1)
		row, col, channel = origin_data.shape
		if channel == 3:
			# do not process if image has no alpha channel
			print("[DILATOR] Texture %s has no alpha channel, ignore" % input_path)
			return

		result = copy.deepcopy(origin_data)

		def dye_red_edge(c0, c1):
			if c1[3] > 3:
				c1[2] = 128					# 128为基础值

		# 对图像边缘染色
		self.for_8_dirs(result, lambda c: c[3] <= 3, dye_red_edge)
		self.sdf_bfs(result)

		# def spread_red(c0, c1):
		# 	if c1[3] > 3 and c1[2] == 0:
		# 		c1[2] = c0[2] + 1

		# for k in range(0, 20):
		# 	# 以r通道 > 0的像素为中心，蔓延红色
		# 	self.for_8_dirs(result, lambda c: c[2] > 0, spread_red)

		is_success, result_buf = cv2.imencode(".png", result, [cv2.IMWRITE_PNG_COMPRESSION, 9])
		if is_success:
			result_buf.tofile(output_path)
		else:
			print("[DIALTOR] Calculate SDF %s failed" % input_path)

	def split(self, json_path, atlas_path, out_dir):
		if not os.path.exists(out_dir):
			os.makedirs(out_dir)

		with open(json_path, "r") as input:
			content = input.read()

		atlas_data = cv2.imdecode(
			np.fromfile(atlas_path, dtype=np.uint8),
			cv2.IMREAD_UNCHANGED)

		# origin_data = cv2.imread(input_path, -1)
		row, col, channel = atlas_data.shape
		
		atlas_info = json.loads(content)
		glyphs = atlas_info["glyphs"]
		for c in glyphs:
			code = c["unicode"]
			bounds = c["atlasBounds"]
			self.pick_glyph_from_atlas(atlas_data, row, bounds, path.join(out_dir, "%s.png" % code))

	def pick_glyph_from_atlas(self, atlas_data, height, bounds, out_path):
		# todo reverse Y
		l = int(bounds["left"])
		r = int(bounds["right"])
		t = int(height-bounds["top"])
		b = int(height-bounds["bottom"])
		glyph_data = atlas_data[t:b+1,l:r+1]

		is_success, result_buf = cv2.imencode(".png", glyph_data, [cv2.IMWRITE_PNG_COMPRESSION, 0])
		if is_success:
			result_buf.tofile(out_path)



if __name__ == "__main__":
    # fire.Fire(Splitter)
	Splitter().split(
		path.join(cur_dir, "msdf.json"), 
		path.join(cur_dir, "msdf.png"),
		path.join(cur_dir, "out"))
