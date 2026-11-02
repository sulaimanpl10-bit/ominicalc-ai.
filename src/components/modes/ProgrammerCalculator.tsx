import React, { useState, useMemo, useCallback } from 'react';
import { Binary, Copy, Check, Delete } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';

type BaseType = 'HEX' | 'DEC' | 'OCT' | 'BIN';
type WordSize = 'QWORD' | 'DWORD' | 'WORD' | 'BYTE';

const WORD_MASKS: Record<WordSize, bigint> = {
  QWORD: 0xffffffffffffffffn,
  DWORD: 0xffffffffn,
  WORD: 0xffffn,
  BYTE: 0xffn,
};

const WORD_BITS: Record<WordSize, number> = {
  QWORD: 64,
  DWORD: 32,
  WORD: 16,
  BYTE: 8,
};

export const ProgrammerCalculator: React.FC = () => {
  const { addHistory, showToast } = useCalculator();

  const [activeBase, setActiveBase] = useState<BaseType>('DEC');
  const [wordSize, setWordSize] = useState<WordSize>('DWORD');
  const [currentVal, setCurrentVal] = useState<bigint>(1024n);
  const [operator, setOperator] = useState<string | null>(null);
  const [prevVal, setPrevVal] = useState<bigint | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const mask = WORD_MASKS[wordSize];
  const maskedVal = (currentVal & mask);

  // Formatted representations
  const hexStr = useMemo(() => maskedVal.toString(16).toUpperCase(), [maskedVal]);
  const decStr = useMemo(() => maskedVal.toString(10), [maskedVal]);
  const octStr = useMemo(() => maskedVal.toString(8), [maskedVal]);
  const binStr = useMemo(() => maskedVal.toString(2).padStart(WORD_BITS[wordSize], '0'), [
    maskedVal,
    wordSize,
  ]);

  // ASCII character preview
  const asciiChar = useMemo(() => {
    const code = Number(maskedVal & 0xffn);
    if (code >= 32 && code <= 126) return String.fromCharCode(code);
    return '·';
  }, [maskedVal]);

  const handleDigit = useCallback(
    (char: string) => {
      let currentStr = '';
      if (activeBase === 'HEX') currentStr = hexStr;
      else if (activeBase === 'DEC') currentStr = decStr;
      else if (activeBase === 'OCT') currentStr = octStr;
      else if (activeBase === 'BIN') currentStr = binStr.replace(/^0+/, '') || '0';

      const newStr = currentStr === '0' ? char : currentStr + char;
      try {
        let parsed = 0n;
        if (activeBase === 'HEX') parsed = BigInt('0x' + newStr);
        else if (activeBase === 'DEC') parsed = BigInt(newStr);
        else if (activeBase === 'OCT') parsed = BigInt('0o' + newStr);
        else if (activeBase === 'BIN') parsed = BigInt('0b' + newStr);

        setCurrentVal(parsed & mask);
      } catch {
        // Ignore overflow
      }
    },
    [activeBase, hexStr, decStr, octStr, binStr, mask]
  );

  const handleBackspace = () => {
    let currentStr = '';
    if (activeBase === 'HEX') currentStr = hexStr;
    else if (activeBase === 'DEC') currentStr = decStr;
    else if (activeBase === 'OCT') currentStr = octStr;
    else if (activeBase === 'BIN') currentStr = binStr.replace(/^0+/, '') || '0';

    if (currentStr.length <= 1) {
      setCurrentVal(0n);
      return;
    }

    const newStr = currentStr.slice(0, -1);
    try {
      let parsed = 0n;
      if (activeBase === 'HEX') parsed = BigInt('0x' + newStr);
      else if (activeBase === 'DEC') parsed = BigInt(newStr);
      else if (activeBase === 'OCT') parsed = BigInt('0o' + newStr);
      else if (activeBase === 'BIN') parsed = BigInt('0b' + newStr);

      setCurrentVal(parsed & mask);
    } catch {
      setCurrentVal(0n);
    }
  };

  const handleClear = () => {
    setCurrentVal(0n);
    setOperator(null);
    setPrevVal(null);
  };

  // Bitwise binary operators
  const handleBitwiseOp = (op: string) => {
    if (op === 'NOT') {
      const res = (~maskedVal) & mask;
      setCurrentVal(res);
      addHistory({
        mode: 'programmer',
        modeName: 'Programmer Calculator',
        expression: `NOT ${decStr}`,
        result: res.toString(10),
      });
      return;
    }

    if (op === '<<') {
      const res = (maskedVal << 1n) & mask;
      setCurrentVal(res);
      return;
    }

    if (op === '>>') {
      const res = (maskedVal >> 1n) & mask;
      setCurrentVal(res);
      return;
    }

    setPrevVal(maskedVal);
    setOperator(op);
    setCurrentVal(0n);
  };

  const handleEquals = () => {
    if (prevVal === null || !operator) return;
    let res = 0n;

    switch (operator) {
      case 'AND':
        res = prevVal & maskedVal;
        break;
      case 'OR':
        res = prevVal | maskedVal;
        break;
      case 'XOR':
        res = prevVal ^ maskedVal;
        break;
      case 'NAND':
        res = ~(prevVal & maskedVal) & mask;
        break;
      case 'NOR':
        res = ~(prevVal | maskedVal) & mask;
        break;
      case '+':
        res = (prevVal + maskedVal) & mask;
        break;
      case '-':
        res = (prevVal - maskedVal) & mask;
        break;
      case '*':
        res = (prevVal * maskedVal) & mask;
        break;
      case '/':
        res = maskedVal !== 0n ? (prevVal / maskedVal) & mask : 0n;
        break;
      case '%':
        res = maskedVal !== 0n ? (prevVal % maskedVal) & mask : 0n;
        break;
      default:
        res = maskedVal;
    }

    addHistory({
      mode: 'programmer',
      modeName: 'Programmer Calculator',
      expression: `${prevVal.toString(10)} ${operator} ${maskedVal.toString(10)}`,
      result: res.toString(10),
      details: `HEX: 0x${res.toString(16).toUpperCase()} · BIN: ${res.toString(2)}`,
    });

    setCurrentVal(res);
    setPrevVal(null);
    setOperator(null);
  };

  // Toggle specific bit in 64-bit board
  const toggleBit = (bitIndex: number) => {
    const bitMask = 1n << BigInt(bitIndex);
    const toggled = maskedVal ^ bitMask;
    setCurrentVal(toggled & mask);
  };

  const handleCopy = (val: string, base: string) => {
    navigator.clipboard.writeText(val);
    setCopied(base);
    showToast(`Copied ${base} value: ${val}`);
    setTimeout(() => setCopied(null), 2000);
  };

  // Determine allowed keypad keys based on current active base
  const isKeyDisabled = (key: string) => {
    if (['A', 'B', 'C', 'D', 'E', 'F'].includes(key)) {
      return activeBase !== 'HEX';
    }
    if (['8', '9'].includes(key)) {
      return activeBase === 'OCT' || activeBase === 'BIN';
    }
    if (['2', '3', '4', '5', '6', '7'].includes(key)) {
      return activeBase === 'BIN';
    }
    return false;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Multi-Base Synchronous Display Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-2.5 transition-colors">
        {/* Word Size Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono">
            {(['QWORD', 'DWORD', 'WORD', 'BYTE'] as WordSize[]).map((ws) => (
              <button
                key={ws}
                onClick={() => setWordSize(ws)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  wordSize === ws
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {ws} ({WORD_BITS[ws]})
              </button>
            ))}
          </div>

          <div className="text-xs font-mono text-slate-400">
            ASCII: <strong className="text-slate-900 dark:text-white text-sm">'{asciiChar}'</strong>
          </div>
        </div>

        {/* 4 Bases Display Rows */}
        <div className="space-y-1.5 font-mono text-xs">
          {/* HEX */}
          <div
            onClick={() => setActiveBase('HEX')}
            className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
              activeBase === 'HEX'
                ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <span className="font-bold text-slate-400 w-12">HEX</span>
            <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate flex-1 text-right px-2">
              {hexStr}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(hexStr, 'HEX');
              }}
              className="p-1 text-slate-400 hover:text-indigo-600"
            >
              {copied === 'HEX' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* DEC */}
          <div
            onClick={() => setActiveBase('DEC')}
            className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
              activeBase === 'DEC'
                ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <span className="font-bold text-slate-400 w-12">DEC</span>
            <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate flex-1 text-right px-2">
              {decStr}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(decStr, 'DEC');
              }}
              className="p-1 text-slate-400 hover:text-indigo-600"
            >
              {copied === 'DEC' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* OCT */}
          <div
            onClick={() => setActiveBase('OCT')}
            className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
              activeBase === 'OCT'
                ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <span className="font-bold text-slate-400 w-12">OCT</span>
            <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate flex-1 text-right px-2">
              {octStr}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(octStr, 'OCT');
              }}
              className="p-1 text-slate-400 hover:text-indigo-600"
            >
              {copied === 'OCT' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* BIN */}
          <div
            onClick={() => setActiveBase('BIN')}
            className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
              activeBase === 'BIN'
                ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <span className="font-bold text-slate-400 w-12">BIN</span>
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate flex-1 text-right px-2 tracking-widest">
              {binStr.match(/.{1,4}/g)?.join(' ') || binStr}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(binStr, 'BIN');
              }}
              className="p-1 text-slate-400 hover:text-indigo-600"
            >
              {copied === 'BIN' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive 64-Bit Bitboard */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <span>Interactive Bitboard ({WORD_BITS[wordSize]}-Bit)</span>
          <span className="text-[10px] text-slate-400 lowercase font-normal">Click any bit to toggle</span>
        </div>

        <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 font-mono text-[11px]">
          {Array.from({ length: WORD_BITS[wordSize] }, (_, i) => {
            const bitIndex = WORD_BITS[wordSize] - 1 - i;
            const isBitSet = ((maskedVal >> BigInt(bitIndex)) & 1n) === 1n;
            return (
              <button
                key={bitIndex}
                onClick={() => toggleBit(bitIndex)}
                title={`Bit ${bitIndex} (2^${bitIndex})`}
                className={`py-1.5 rounded flex flex-col items-center justify-center transition-all ${
                  isBitSet
                    ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{isBitSet ? '1' : '0'}</span>
                <span className="text-[8px] opacity-60">{bitIndex}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Programmer Keypad */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="grid grid-cols-6 gap-2 text-xs sm:text-sm font-mono">
          {/* Bitwise Logic Row */}
          <button
            onClick={() => handleBitwiseOp('AND')}
            className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold"
          >
            AND
          </button>
          <button
            onClick={() => handleBitwiseOp('OR')}
            className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold"
          >
            OR
          </button>
          <button
            onClick={() => handleBitwiseOp('XOR')}
            className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold"
          >
            XOR
          </button>
          <button
            onClick={() => handleBitwiseOp('NOT')}
            className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold"
          >
            NOT
          </button>
          <button
            onClick={() => handleBitwiseOp('<<')}
            className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold"
          >
            LSH &lt;&lt;
          </button>
          <button
            onClick={() => handleBitwiseOp('>>')}
            className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold"
          >
            RSH &gt;&gt;
          </button>

          {/* Row 1 */}
          <button
            onClick={() => handleDigit('A')}
            disabled={isKeyDisabled('A')}
            className="py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold border border-slate-200/60 dark:border-slate-700 disabled:opacity-30"
          >
            A
          </button>
          <button
            onClick={() => handleDigit('B')}
            disabled={isKeyDisabled('B')}
            className="py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold border border-slate-200/60 dark:border-slate-700 disabled:opacity-30"
          >
            B
          </button>
          <button
            onClick={() => handleDigit('7')}
            disabled={isKeyDisabled('7')}
            className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold border border-slate-200/60 dark:border-slate-700 disabled:opacity-30"
          >
            7
          </button>
          <button
            onClick={() => handleDigit('8')}
            disabled={isKeyDisabled('8')}
            className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold border border-slate-200/60 dark:border-slate-700 disabled:opacity-30"
          >
            8
          </button>
          <button
            onClick={() => handleDigit('9')}
            disabled={isKeyDisabled('9')}
            className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold border border-slate-200/60 dark:border-slate-700 disabled:opacity-30"
          >
            9
          </button>
          <button
            onClick={handleBackspace}
            className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300"
          >
            <Delete className="w-4 h-4" />
          </button>

          {/* Row 2 */}
          <button
            onClick={() => handleDigit('C')}
            disabled={isKeyDisabled('C')}
            className="py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold border border-slate-200/60 dark:border-slate-700 disabled:opacity-30"
          >
            C
          </button>
          <button
            onClick={() => handleDigit('D')}
            disabled={isKeyDisabled('D')}
            className="py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold border border-slate-200/60 dark:border-slate-700 disabled:opacity-30"
          >
            D
          </button>
          <button
            onClick={() => handleDigit('4')}
            disabled={isKeyDisabled('4')}
            className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold border border-slate-200/60 dark:border-slate-700 disabled:opacity-30"
          >
            4
          </button>
          <button
            onClick={() => handleDigit('5')}
            disabled={isKeyDisabled('5')}
            className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold border border-slate-200/60 dark:border-slate-700 disabled:opacity-30"
          >
            5
          </button>
          <button
            onClick={() => handleDigit('6')}
            disabled={isKeyDisabled('6')}
            className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold border border-slate-200/60 dark:border-slate-700 disabled:opacity-30"
          >
            6
          </button>
          <button
            onClick={handleClear}
            className="py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-bold"
          >
            CLR
          </button>

          {/* Row 3 */}
          <button
            onClick={() => handleDigit('E')}
            disabled={isKeyDisabled('E')}
            className="py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold border border-slate-200/60 dark:border-slate-700 disabled:opacity-30"
          >
            E
          </button>
          <button
            onClick={() => handleDigit('F')}
            disabled={isKeyDisabled('F')}
            className="py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold border border-slate-200/60 dark:border-slate-700 disabled:opacity-30"
          >
            F
          </button>
          <button
            onClick={() => handleDigit('1')}
            disabled={isKeyDisabled('1')}
            className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold border border-slate-200/60 dark:border-slate-700 disabled:opacity-30"
          >
            1
          </button>
          <button
            onClick={() => handleDigit('2')}
            disabled={isKeyDisabled('2')}
            className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold border border-slate-200/60 dark:border-slate-700 disabled:opacity-30"
          >
            2
          </button>
          <button
            onClick={() => handleDigit('3')}
            disabled={isKeyDisabled('3')}
            className="py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold border border-slate-200/60 dark:border-slate-700 disabled:opacity-30"
          >
            3
          </button>
          <button
            onClick={handleEquals}
            className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
          >
            =
          </button>

          {/* Row 4 */}
          <button
            onClick={() => handleBitwiseOp('NAND')}
            className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold"
          >
            NAND
          </button>
          <button
            onClick={() => handleBitwiseOp('NOR')}
            className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold"
          >
            NOR
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="col-span-2 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold border border-slate-200/60 dark:border-slate-700"
          >
            0
          </button>
          <button
            onClick={() => handleBitwiseOp('+')}
            className="py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-bold"
          >
            +
          </button>
          <button
            onClick={() => handleBitwiseOp('-')}
            className="py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-bold"
          >
            −
          </button>
        </div>
      </div>
    </div>
  );
};
