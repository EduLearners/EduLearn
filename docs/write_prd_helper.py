"""Run this once to write the PRD from Claude's output folder.
Usage: python write_prd_helper.py
"""
import shutil, os
src = os.path.expanduser("~/Downloads/EduLearn-PRD-v11.0.docx")
dst = os.path.join(os.path.dirname(__file__), "EduLearn-PRD-v11.0.docx")
if os.path.exists(src):
    shutil.copy2(src, dst)
    print(f"Copied {src} -> {dst}")
else:
    print("Source not found:", src)
