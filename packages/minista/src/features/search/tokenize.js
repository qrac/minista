// @ts-check
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

// Character ranges and precedence from mojigiri 0.3.0.
// Keep whitespace and unmatched runs (including emoji) as tokens.
const patterns = [
  "[ ]+",
  "\n",
  "[0-9]+",
  "[a-zA-Z]+",
  "[\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u00BF]", // Unicode !-/ :-@ [-` {-¿
  "[　]+",
  "[０-９]+",
  "[Ａ-Ｚ]+",
  "[ぁ-んー〜]+",
  "[ァ-ヴー〜]+",
  "[ｦ-ﾟ]+",
  "[一二三四五六七八九十壱弐参拾百千万萬億兆〇]+",
  "[\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u3005\u3007\u3021-\u3029\u3038-\u303B\u3400-\u4DB5\u4E00-\u9FC3\uF900-\uFA2D\uFA30-\uFA6A\uFA70-\uFAD9]+", // Kanji
  "[！-／：-＠［-｀｛-～、-〜”’・※]",
]
const TOKEN_PATTERN = new RegExp(`(${patterns.join("|")})`, "ig")

// split() does not advance the shared RegExp lastIndex. No per-call state is shared.
/** @param {string} text @returns {string[]} */
export function tokenizeSearchText(text) {
  if (!text) return []
  return text.split(TOKEN_PATTERN).filter((word) => word.length > 0)
}
