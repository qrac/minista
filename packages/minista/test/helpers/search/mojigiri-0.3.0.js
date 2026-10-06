/*
MIT License

Copyright (c) 2022 Qrac

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
// Frozen mojigiri 0.3.0 oracle for compatibility tests and benchmarks.
/** @param {string} text */
const mojigiri = (text) => {
  if (!text) {
    return [];
  }
  const patterns = [
    "[ ]+",
    "\n",
    "[0-9]+",
    "[a-zA-Z]+",
    "[!-/:-@[-`{-\xBF]",
    "[\u3000]+",
    "[\uFF10-\uFF19]+",
    "[\uFF21-\uFF3A]+",
    "[\u3041-\u3093\u30FC\u301C]+",
    "[\u30A1-\u30F4\u30FC\u301C]+",
    "[\uFF66-\uFF9F]+",
    "[\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D\u5341\u58F1\u5F10\u53C2\u62FE\u767E\u5343\u4E07\u842C\u5104\u5146\u3007]+",
    "[\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u3005\u3007\u3021-\u3029\u3038-\u303B\u3400-\u4DB5\u4E00-\u9FC3\uF900-\uFA2D\uFA30-\uFA6A\uFA70-\uFAD9]+",
    "[\uFF01-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF40\uFF5B-\uFF5E\u3001-\u301C\u201D\u2019\u30FB\u203B]"
  ];
  const reg = new RegExp(`(${patterns.join("|")})`, "ig");
  const words = text.split(reg);
  const filteredWords = words.filter((word) => word.length > 0);
  const result = filteredWords;
  return result;
};
var src_default = mojigiri;
export {
  src_default as default
};
