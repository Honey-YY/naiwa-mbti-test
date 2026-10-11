#!/usr/bin/env python3
"""
生成页面背景图 —— 奶蛙 MBTI 测试

作者给的原图是 859x861 的正方形截图（白底 + 底部地影），直接当网页背景会被
`background-size: cover` 放大到 1.7 倍（发虚），而且正方形在宽屏上必须裁掉头顶、
在窄屏上又会露出底部那条深色地影。

这里把它合成到一张 16:10 的奶白色画布上：
  - 角色按**原始像素**放置（不放大，保证清晰）；
  - 底边渐隐进主题色 #fff7e6，化掉原图的地影硬边；
  - 左右与顶部小幅羽化，让图片边界与底色无缝。

依赖：Pillow（python3 -m pip install pillow）
用法：python3 scripts/make-background.py
      python3 scripts/make-background.py --source 奶蛙图片/xxx.png
"""
import argparse
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit('需要 Pillow：python3 -m pip install pillow')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 画布尺寸与底色
# 底色必须与原图背景**完全一致**（原图上半部分背景是纯白 255,255,255），
# 否则画布与原图交界处会出现一条肉眼可见的色差方框。
CANVAS_W, CANVAS_H = 1920, 1000
BG_COLOR = (255, 255, 255)

# 羽化宽度（像素，基于原图坐标）。底色一致时几乎不需要，留几像素防硬边。
FEATHER_TOP = 6
FEATHER_SIDE = 6
# 底部渐隐：从这个 y（原图坐标）开始，到图片底边完全透明（化掉原图自带的地影）
FADE_FROM = 700


def build_mask(width, height):
    """竖向渐隐 x 横向羽化，返回 L 模式蒙版。"""
    mask = Image.new('L', (width, height), 0)
    px = mask.load()
    for y in range(height):
        if y <= FADE_FROM:
            a_y = 1.0
        else:
            a_y = max(0.0, (height - y) / float(height - FADE_FROM))
        for x in range(width):
            if x < FEATHER_SIDE:
                a_x = x / float(FEATHER_SIDE)
            elif x >= width - FEATHER_SIDE:
                a_x = (width - x) / float(FEATHER_SIDE)
            else:
                a_x = 1.0
            if y < FEATHER_TOP:
                a_y2 = a_y * (y / float(FEATHER_TOP))
            else:
                a_y2 = a_y
            px[x, y] = int(round(255 * a_x * a_y2))
    return mask


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', default='奶蛙图片/奶蛙界面背景.png',
                    help='原图路径（默认 奶蛙图片/奶蛙界面背景.png）')
    ap.add_argument('--out', default='public/bg/background.jpg', help='输出路径')
    args = ap.parse_args()

    src_path = os.path.join(ROOT, args.source)
    out_path = os.path.join(ROOT, args.out)
    char = Image.open(src_path).convert('RGB')
    cw, ch = char.size

    canvas = Image.new('RGB', (CANVAS_W, CANVAS_H), BG_COLOR)
    x0 = (CANVAS_W - cw) // 2
    y0 = CANVAS_H - ch                      # 角色底边贴画布底边
    if y0 < 0:                              # 原图比画布还高时等比缩小
        ratio = CANVAS_H / float(ch)
        char = char.resize((int(cw * ratio), CANVAS_H), Image.LANCZOS)
        cw, ch = char.size
        x0 = (CANVAS_W - cw) // 2
        y0 = 0

    mask = build_mask(cw, ch)
    canvas.paste(char, (x0, y0), mask)
    canvas.save(out_path, quality=92, optimize=True, progressive=True)
    print('wrote %s  %dx%d  %.1f KB  (角色 %dx%d @ %d,%d)'
          % (args.out, CANVAS_W, CANVAS_H, os.path.getsize(out_path) / 1024.0,
             cw, ch, x0, y0))


if __name__ == '__main__':
    main()
