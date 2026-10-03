import React, { useState, useMemo, useRef, useCallback } from 'react';
import { 
  Candle, 
  CryptoPair 
} from '../types/trading';
import { 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  SlidersHorizontal, 
  Eye, 
  EyeOff, 
  Grid, 
  TrendingUp, 
  BarChart2, 
  Activity, 
  Layers
} from 'lucide-react';

export type ChartType = 'candles' | 'line' | 'area' | 'bars' | 'heikin_ashi';

interface TradingChartProps {
  candles: Candle[];
  selectedPair: CryptoPair;
  currentPrice: number;
  targetBuyPrice?: number;
  targetTakeProfitPrice?: number;
  targetStopLossPrice?: number;
  activeEntryPrice?: number;
  timeframe: string;
  onChangeTimeframe: (tf: string) => void;
}

export const TradingChart: React.FC<TradingChartProps> = ({
  candles,
  selectedPair,
  currentPrice,
  targetBuyPrice,
  targetTakeProfitPrice,
  targetStopLossPrice,
  activeEntryPrice,
  timeframe,
  onChangeTimeframe
}) => {
  // Chart Visual Customization States
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [showEma20, setShowEma20] = useState<boolean>(true);
  const [showEma50, setShowEma50] = useState<boolean>(true);
  const [showBollinger, setShowBollinger] = useState<boolean>(false);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [showBotTargets, setShowBotTargets] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [candleZoomCount, setCandleZoomCount] = useState<number>(36); // Number of visible candles
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);

  // Crosshair state
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Available Timeframes
  const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1D'];

  // 1. Calculate Heikin-Ashi candles if selected
  const displayCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];

    // Slice based on zoom
    const sliced = candles.slice(-Math.min(candles.length, candleZoomCount));

    if (chartType !== 'heikin_ashi') {
      return sliced;
    }

    const haCandles: Candle[] = [];
    let prevHaOpen = sliced[0].open;
    let prevHaClose = sliced[0].close;

    for (let i = 0; i < sliced.length; i++) {
      const c = sliced[i];
      const haClose = (c.open + c.high + c.low + c.close) / 4;
      const haOpen = i === 0 ? (c.open + c.close) / 2 : (prevHaOpen + prevHaClose) / 2;
      const haHigh = Math.max(c.high, haOpen, haClose);
      const haLow = Math.min(c.low, haOpen, haClose);

      haCandles.push({
        time: c.time,
        open: haOpen,
        high: haHigh,
        low: haLow,
        close: haClose,
        volume: c.volume
      });

      prevHaOpen = haOpen;
      prevHaClose = haClose;
    }

    return haCandles;
  }, [candles, candleZoomCount, chartType]);

  // 2. Calculate Technical Indicators (EMA 20, EMA 50, Bollinger Bands)
  const indicatorSeries = useMemo<{
    ema20: (number | null)[];
    ema50: (number | null)[];
    upper: (number | null)[];
    lower: (number | null)[];
    mid: (number | null)[];
  }>(() => {
    if (!displayCandles || displayCandles.length === 0) {
      return { ema20: [], ema50: [], upper: [], lower: [], mid: [] };
    }

    const closes = displayCandles.map(c => c.close);
    const n = closes.length;

    // Helper for EMA
    const calcEMA = (period: number) => {
      const k = 2 / (period + 1);
      const ema: (number | null)[] = [];
      let prevEMA = closes[0];
      for (let i = 0; i < n; i++) {
        if (i < 2) {
          ema.push(null);
        } else {
          const val = closes[i] * k + prevEMA * (1 - k);
          ema.push(val);
          prevEMA = val;
        }
      }
      return ema;
    };

    // Helper for Bollinger Bands (20, 2)
    const calcBollinger = () => {
      const period = 14;
      const upper: (number | null)[] = [];
      const lower: (number | null)[] = [];
      const mid: (number | null)[] = [];

      for (let i = 0; i < n; i++) {
        if (i < period - 1) {
          upper.push(null);
          lower.push(null);
          mid.push(null);
        } else {
          const slice = closes.slice(i - period + 1, i + 1);
          const mean = slice.reduce((a, b) => a + b, 0) / period;
          const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
          const stdDev = Math.sqrt(variance);
          mid.push(mean);
          upper.push(mean + stdDev * 2);
          lower.push(mean - stdDev * 2);
        }
      }
      return { upper, lower, mid };
    };

    return {
      ema20: calcEMA(20),
      ema50: calcEMA(50),
      ...calcBollinger()
    };
  }, [displayCandles]);

  // 3. Price Scales and Geometry
  const chartHeight = isFullscreen ? 520 : 320;
  const volumeHeight = showVolume ? 60 : 0;
  const svgHeight = chartHeight + volumeHeight + 24;
  const svgWidth = 920;
  const rightAxisWidth = 84;
  const candleAreaWidth = svgWidth - rightAxisWidth;

  const { minPrice, maxPrice, priceRange, maxVolume } = useMemo(() => {
    if (!displayCandles || displayCandles.length === 0) {
      const p = currentPrice || selectedPair.initialPrice;
      return { minPrice: p * 0.98, maxPrice: p * 1.02, priceRange: p * 0.04, maxVolume: 100 };
    }

    let min = Math.min(...displayCandles.map(c => c.low));
    let max = Math.max(...displayCandles.map(c => c.high));
    const vol = Math.max(...displayCandles.map(c => c.volume));

    // Factor in Bot Target Lines if enabled
    if (showBotTargets) {
      if (targetBuyPrice && targetBuyPrice > 0) min = Math.min(min, targetBuyPrice * 0.996);
      if (targetStopLossPrice && targetStopLossPrice > 0) min = Math.min(min, targetStopLossPrice * 0.996);
      if (targetTakeProfitPrice && targetTakeProfitPrice > 0) max = Math.max(max, targetTakeProfitPrice * 1.004);
      if (activeEntryPrice && activeEntryPrice > 0) {
        min = Math.min(min, activeEntryPrice * 0.996);
        max = Math.max(max, activeEntryPrice * 1.004);
      }
    }

    // Add 4% vertical breathing room
    const padding = (max - min) * 0.05 || 10;
    const finalMin = min - padding;
    const finalMax = max + padding;
    return {
      minPrice: finalMin,
      maxPrice: finalMax,
      priceRange: finalMax - finalMin || 1,
      maxVolume: vol || 1
    };
  }, [displayCandles, currentPrice, selectedPair, targetBuyPrice, targetTakeProfitPrice, targetStopLossPrice, activeEntryPrice, showBotTargets]);

  const candleCount = displayCandles.length || 1;
  const candleSpacing = candleAreaWidth / candleCount;
  const candleWidth = Math.max(3, Math.min(18, candleSpacing * 0.68));

  const getY = useCallback((val: number) => {
    const norm = (val - minPrice) / priceRange;
    return chartHeight - norm * chartHeight;
  }, [minPrice, priceRange, chartHeight]);

  const getX = useCallback((idx: number) => {
    return idx * candleSpacing + candleSpacing / 2;
  }, [candleSpacing]);

  // Handle Mouse Hover on SVG for Crosshair
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const scaleX = svgWidth / rect.width;
    const scaleY = svgHeight / rect.height;

    const svgX = clientX * scaleX;
    const svgY = clientY * scaleY;

    if (svgX >= 0 && svgX <= candleAreaWidth) {
      const idx = Math.min(
        displayCandles.length - 1,
        Math.max(0, Math.floor(svgX / candleSpacing))
      );
      setHoverIndex(idx);
      setMousePos({ x: svgX, y: svgY });
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setMousePos(null);
  };

  const activeCandle = hoverIndex !== null && displayCandles[hoverIndex]
    ? displayCandles[hoverIndex]
    : displayCandles[displayCandles.length - 1] || null;

  const activeCandleChange = activeCandle
    ? ((activeCandle.close - activeCandle.open) / activeCandle.open) * 100
    : 0;

  // Zoom controls
  const handleZoomIn = () => {
    setCandleZoomCount(prev => Math.max(16, prev - 8));
  };

  const handleZoomOut = () => {
    setCandleZoomCount(prev => Math.min(80, prev + 10));
  };

  const handleResetZoom = () => {
    setCandleZoomCount(36);
  };

  // Build SVG path for Line / Area chart
  const linePoints = useMemo(() => {
    if (displayCandles.length === 0) return '';
    return displayCandles.map((c, i) => `${getX(i)},${getY(c.close)}`).join(' ');
  }, [displayCandles, getX, getY]);

  const areaPath = useMemo(() => {
    if (displayCandles.length === 0) return '';
    const firstX = getX(0);
    const lastX = getX(displayCandles.length - 1);
    return `M ${firstX},${chartHeight} L ${displayCandles.map((c, i) => `${getX(i)},${getY(c.close)}`).join(' L ')} L ${lastX},${chartHeight} Z`;
  }, [displayCandles, getX, getY, chartHeight]);

  // Build SVG paths for Indicator curves
  const ema20Path = useMemo(() => {
    if (!showEma20 || displayCandles.length === 0) return '';
    const pts: string[] = [];
    indicatorSeries.ema20.forEach((val, i) => {
      if (val !== null) pts.push(`${getX(i)},${getY(val)}`);
    });
    return pts.length > 1 ? `M ${pts.join(' L ')}` : '';
  }, [showEma20, displayCandles, indicatorSeries.ema20, getX, getY]);

  const ema50Path = useMemo(() => {
    if (!showEma50 || displayCandles.length === 0) return '';
    const pts: string[] = [];
    indicatorSeries.ema50.forEach((val, i) => {
      if (val !== null) pts.push(`${getX(i)},${getY(val)}`);
    });
    return pts.length > 1 ? `M ${pts.join(' L ')}` : '';
  }, [showEma50, displayCandles, indicatorSeries.ema50, getX, getY]);

  const bollingerPaths = useMemo(() => {
    if (!showBollinger || displayCandles.length === 0) return { upper: '', lower: '', band: '' };
    const upperPts: [number, number][] = [];
    const lowerPts: [number, number][] = [];

    indicatorSeries.upper.forEach((val, i) => {
      if (val !== null && indicatorSeries.lower[i] !== null) {
        upperPts.push([getX(i), getY(val)]);
        lowerPts.push([getX(i), getY(indicatorSeries.lower[i]!)]);
      }
    });

    if (upperPts.length <= 1) return { upper: '', lower: '', band: '' };

    const upperStr = `M ${upperPts.map(p => `${p[0]},${p[1]}`).join(' L ')}`;
    const lowerStr = `M ${lowerPts.map(p => `${p[0]},${p[1]}`).join(' L ')}`;
    const bandStr = `${upperStr} L ${[...lowerPts].reverse().map(p => `${p[0]},${p[1]}`).join(' L ')} Z`;

    return { upper: upperStr, lower: lowerStr, band: bandStr };
  }, [showBollinger, displayCandles, indicatorSeries, getX, getY]);

  // Hovered price on crosshair
  const hoveredPrice = mousePos && mousePos.y <= chartHeight
    ? maxPrice - (mousePos.y / chartHeight) * priceRange
    : null;

  return (
    <div className={`bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col gap-3 transition-all ${
      isFullscreen ? 'fixed inset-3 z-50 bg-[#090d16] shadow-2xl flex flex-col justify-between overflow-y-auto' : ''
    }`}>
      {/* 1. TOP TOOLBAR: Visual Modes, Timeframes, Indicators, Zoom & Fullscreen */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        {/* Left: Pair Name + Chart Mode Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
            <span>{selectedPair.baseAsset}/{selectedPair.quoteAsset}</span>
            <span className="text-[10px] text-slate-400 font-sans font-normal">· Spot Binance</span>
          </div>

          {/* Timeframe Segmented Selector */}
          <div className="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded border border-slate-800">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => onChangeTimeframe(tf)}
                className={`px-2 py-0.5 text-[11px] font-mono font-medium rounded transition-colors cursor-pointer ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Type Selector (Velas, Linha, Área, Barras, Heikin-Ashi) */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
            <button
              onClick={() => setChartType('candles')}
              title="Velas Japonesas (Candlesticks)"
              className={`px-2 py-1 text-xs rounded transition-colors cursor-pointer flex items-center gap-1 ${
                chartType === 'candles' ? 'bg-slate-800 text-emerald-400 font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Velas</span>
            </button>

            <button
              onClick={() => setChartType('line')}
              title="Gráfico de Linha Contínua"
              className={`px-2 py-1 text-xs rounded transition-colors cursor-pointer flex items-center gap-1 ${
                chartType === 'line' ? 'bg-slate-800 text-cyan-400 font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Linha</span>
            </button>

            <button
              onClick={() => setChartType('area')}
              title="Gráfico de Área com Gradiente"
              className={`px-2 py-1 text-xs rounded transition-colors cursor-pointer flex items-center gap-1 ${
                chartType === 'area' ? 'bg-slate-800 text-blue-400 font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Área</span>
            </button>

            <button
              onClick={() => setChartType('heikin_ashi')}
              title="Velas Suavizadas Heikin-Ashi"
              className={`px-2 py-1 text-xs rounded transition-colors cursor-pointer flex items-center gap-1 ${
                chartType === 'heikin_ashi' ? 'bg-slate-800 text-amber-400 font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Heikin-Ashi</span>
            </button>
          </div>
        </div>

        {/* Right: Indicator Toggles, Zoom, Grid and Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Indicator Toggles */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => setShowEma20(!showEma20)}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                showEma20 ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Média Móvel Exponencial 20 períodos"
            >
              EMA 20
            </button>

            <button
              onClick={() => setShowEma50(!showEma50)}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                showEma50 ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Média Móvel Exponencial 50 períodos"
            >
              EMA 50
            </button>

            <button
              onClick={() => setShowBollinger(!showBollinger)}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                showBollinger ? 'bg-blue-500/20 text-blue-300 font-semibold' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Bandas de Bollinger (20, 2)"
            >
              BB 20,2
            </button>

            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                showVolume ? 'bg-slate-800 text-slate-200' : 'text-slate-500'
              }`}
              title="Mostrar/Ocultar Volume"
            >
              Vol
            </button>

            <button
              onClick={() => setShowBotTargets(!showBotTargets)}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                showBotTargets ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-500'
              }`}
              title="Mostrar Linhas de Gatilho do Robô"
            >
              Alvos Robô
            </button>
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded border border-slate-800">
            <button
              onClick={handleZoomIn}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="Aumentar Zoom (Velas maiores)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="Diminuir Zoom (Mais velas visíveis)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="Redefinir Zoom Padrão"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded border transition-colors cursor-pointer ${
              showGrid ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Alternar Linhas de Grade"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Expand */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Expandir Gráfico'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. OHLCV & INDICATOR VALUES INSPECTION BAR */}
      {activeCandle && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-numbers px-2 py-1 bg-slate-950/60 rounded border border-slate-800/80">
          <div className="flex flex-wrap items-center gap-3 text-slate-400">
            <span className="text-slate-300 font-sans font-semibold">
              {new Date(activeCandle.time).toLocaleTimeString()}
            </span>
            <div>O: <span className="text-slate-200 font-semibold">${activeCandle.open.toFixed(2)}</span></div>
            <div>H: <span className="text-slate-200 font-semibold">${activeCandle.high.toFixed(2)}</span></div>
            <div>L: <span className="text-slate-200 font-semibold">${activeCandle.low.toFixed(2)}</span></div>
            <div>
              C: <span className={`font-semibold ${activeCandle.close >= activeCandle.open ? 'text-emerald-400' : 'text-red-400'}`}>
                ${activeCandle.close.toFixed(2)}
              </span>
            </div>
            <div>
              Var: <span className={`font-semibold ${activeCandleChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {activeCandleChange >= 0 ? '+' : ''}{activeCandleChange.toFixed(2)}%
              </span>
            </div>
            {showVolume && (
              <div>Vol: <span className="text-slate-300 font-semibold">{activeCandle.volume.toFixed(2)}</span></div>
            )}
          </div>

          {/* Indicator values at cursor */}
          <div className="hidden sm:flex items-center gap-3 text-[10px]">
            {showEma20 && hoverIndex !== null && indicatorSeries.ema20[hoverIndex] && (
              <span className="text-amber-400">
                EMA20: ${indicatorSeries.ema20[hoverIndex]!.toFixed(2)}
              </span>
            )}
            {showEma50 && hoverIndex !== null && indicatorSeries.ema50[hoverIndex] && (
              <span className="text-indigo-400">
                EMA50: ${indicatorSeries.ema50[hoverIndex]!.toFixed(2)}
              </span>
            )}
            {showBollinger && hoverIndex !== null && indicatorSeries.upper[hoverIndex] && (
              <span className="text-blue-400">
                BB(20): [${indicatorSeries.lower[hoverIndex]!.toFixed(1)} - ${indicatorSeries.upper[hoverIndex]!.toFixed(1)}]
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. SVG CHART VIEWPORT */}
      <div className="relative w-full overflow-hidden select-none bg-[#090d16] rounded-lg border border-slate-900">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full"
          style={{ height: isFullscreen ? 'calc(100vh - 180px)' : '380px' }}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Area Chart Gradient */}
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#0284c7" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
            </linearGradient>

            {/* Bollinger Band Shading Gradient */}
            <linearGradient id="bbGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
            </linearGradient>

            {/* Volume bar gradients */}
            <linearGradient id="volGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="volRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* GRID LINES */}
          {showGrid && (
            <g opacity="0.6">
              {[0.15, 0.35, 0.55, 0.75, 0.95].map((pct) => {
                const y = chartHeight * pct;
                const priceVal = maxPrice - (pct * priceRange);
                return (
                  <g key={`grid-h-${pct}`}>
                    <line
                      x1="0"
                      y1={y}
                      x2={candleAreaWidth}
                      y2={y}
                      stroke="#1a2233"
                      strokeDasharray="2 3"
                      strokeWidth="1"
                    />
                    <text
                      x={candleAreaWidth + 6}
                      y={y + 3}
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      ${priceVal.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Vertical Grid Lines */}
              {displayCandles.map((c, i) => {
                if (i % Math.max(4, Math.floor(candleCount / 7)) === 0) {
                  const x = getX(i);
                  return (
                    <line
                      key={`grid-v-${i}`}
                      x1={x}
                      y1="0"
                      x2={x}
                      y2={chartHeight}
                      stroke="#141c2c"
                      strokeDasharray="2 4"
                      strokeWidth="1"
                    />
                  );
                }
                return null;
              })}
            </g>
          )}

          {/* BOLLINGER BANDS */}
          {showBollinger && bollingerPaths.band && (
            <g>
              <path d={bollingerPaths.band} fill="url(#bbGradient)" />
              <path d={bollingerPaths.upper} stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.6" />
              <path d={bollingerPaths.lower} stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.6" />
            </g>
          )}

          {/* VOLUME BARS (BOTTOM PANE) */}
          {showVolume && (
            <g>
              <line
                x1="0"
                y1={chartHeight}
                x2={svgWidth}
                y2={chartHeight}
                stroke="#1e293b"
                strokeWidth="1"
              />
              {displayCandles.map((c, i) => {
                const x = getX(i);
                const isBull = c.close >= c.open;
                const h = (c.volume / maxVolume) * volumeHeight;
                const y = chartHeight + volumeHeight - h;
                return (
                  <rect
                    key={`vol-${c.time}-${i}`}
                    x={x - candleWidth / 2}
                    y={y}
                    width={candleWidth}
                    height={Math.max(1, h)}
                    fill={isBull ? 'url(#volGreen)' : 'url(#volRed)'}
                    rx="1"
                  />
                );
              })}
            </g>
          )}

          {/* CHART TYPE 1: AREA */}
          {chartType === 'area' && (
            <g>
              <path d={areaPath} fill="url(#areaGradient)" />
              <polyline points={linePoints} fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}

          {/* CHART TYPE 2: LINE */}
          {chartType === 'line' && (
            <g>
              <polyline points={linePoints} fill="none" stroke="#06b6d4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              {displayCandles.map((c, i) => (
                <circle
                  key={`dot-${i}`}
                  cx={getX(i)}
                  cy={getY(c.close)}
                  r="2.5"
                  fill="#0891b2"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              ))}
            </g>
          )}

          {/* CHART TYPE 3: CANDLESTICKS OR HEIKIN-ASHI */}
          {(chartType === 'candles' || chartType === 'heikin_ashi') && (
            <g>
              {displayCandles.map((c, i) => {
                const x = getX(i);
                const isBull = c.close >= c.open;
                const yHigh = getY(c.high);
                const yLow = getY(c.low);
                const yOpen = getY(c.open);
                const yClose = getY(c.close);
                const bodyY = Math.min(yOpen, yClose);
                const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
                const color = isBull ? '#10b981' : '#ef4444';

                return (
                  <g key={`candle-${c.time}-${i}`}>
                    {/* Wick */}
                    <line
                      x1={x}
                      y1={yHigh}
                      x2={x}
                      y2={yLow}
                      stroke={color}
                      strokeWidth="1.2"
                    />
                    {/* Body */}
                    <rect
                      x={x - candleWidth / 2}
                      y={bodyY}
                      width={candleWidth}
                      height={bodyHeight}
                      fill={color}
                      rx="1"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* CHART TYPE 4: OHLC WESTERN BARS */}
          {chartType === 'bars' && (
            <g>
              {displayCandles.map((c, i) => {
                const x = getX(i);
                const isBull = c.close >= c.open;
                const yHigh = getY(c.high);
                const yLow = getY(c.low);
                const yOpen = getY(c.open);
                const yClose = getY(c.close);
                const color = isBull ? '#10b981' : '#ef4444';
                const tickLen = candleWidth * 0.7;

                return (
                  <g key={`bar-${c.time}-${i}`}>
                    {/* High-Low Spine */}
                    <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.5" />
                    {/* Left Open Tick */}
                    <line x1={x - tickLen} y1={yOpen} x2={x} y2={yOpen} stroke={color} strokeWidth="1.5" />
                    {/* Right Close Tick */}
                    <line x1={x} y1={yClose} x2={x + tickLen} y2={yClose} stroke={color} strokeWidth="1.5" />
                  </g>
                );
              })}
            </g>
          )}

          {/* EMA INDICATOR LINES */}
          {showEma20 && ema20Path && (
            <path d={ema20Path} fill="none" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
          )}

          {showEma50 && ema50Path && (
            <path d={ema50Path} fill="none" stroke="#818cf8" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
          )}

          {/* ROBOT TARGET TRIGGER LINES (BUY DIP, TAKE PROFIT, STOP LOSS) */}
          {showBotTargets && (
            <g>
              {/* TARGET LINE: BUY DIP (Cyan) */}
              {targetBuyPrice && targetBuyPrice > 0 && (
                <g>
                  <line
                    x1="0"
                    y1={getY(targetBuyPrice)}
                    x2={candleAreaWidth}
                    y2={getY(targetBuyPrice)}
                    stroke="#06b6d4"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <rect
                    x={candleAreaWidth + 2}
                    y={getY(targetBuyPrice) - 8}
                    width={rightAxisWidth - 4}
                    height={16}
                    fill="#0891b2"
                    rx="2"
                  />
                  <text
                    x={candleAreaWidth + 6}
                    y={getY(targetBuyPrice) + 4}
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    COMPRA ${targetBuyPrice.toFixed(1)}
                  </text>
                </g>
              )}

              {/* TARGET LINE: TAKE PROFIT (Green) */}
              {targetTakeProfitPrice && targetTakeProfitPrice > 0 && (
                <g>
                  <line
                    x1="0"
                    y1={getY(targetTakeProfitPrice)}
                    x2={candleAreaWidth}
                    y2={getY(targetTakeProfitPrice)}
                    stroke="#10b981"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <rect
                    x={candleAreaWidth + 2}
                    y={getY(targetTakeProfitPrice) - 8}
                    width={rightAxisWidth - 4}
                    height={16}
                    fill="#047857"
                    rx="2"
                  />
                  <text
                    x={candleAreaWidth + 6}
                    y={getY(targetTakeProfitPrice) + 4}
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    LUCRO ${targetTakeProfitPrice.toFixed(1)}
                  </text>
                </g>
              )}

              {/* TARGET LINE: STOP LOSS (Red) */}
              {targetStopLossPrice && targetStopLossPrice > 0 && (
                <g>
                  <line
                    x1="0"
                    y1={getY(targetStopLossPrice)}
                    x2={candleAreaWidth}
                    y2={getY(targetStopLossPrice)}
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <rect
                    x={candleAreaWidth + 2}
                    y={getY(targetStopLossPrice) - 8}
                    width={rightAxisWidth - 4}
                    height={16}
                    fill="#b91c1c"
                    rx="2"
                  />
                  <text
                    x={candleAreaWidth + 6}
                    y={getY(targetStopLossPrice) + 4}
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    STOP ${targetStopLossPrice.toFixed(1)}
                  </text>
                </g>
              )}

              {/* ACTIVE ENTRY PRICE LINE (Amber) */}
              {activeEntryPrice && activeEntryPrice > 0 && (
                <g>
                  <line
                    x1="0"
                    y1={getY(activeEntryPrice)}
                    x2={candleAreaWidth}
                    y2={getY(activeEntryPrice)}
                    stroke="#f59e0b"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                  />
                  <rect
                    x={candleAreaWidth + 2}
                    y={getY(activeEntryPrice) - 8}
                    width={rightAxisWidth - 4}
                    height={16}
                    fill="#b45309"
                    rx="2"
                  />
                  <text
                    x={candleAreaWidth + 6}
                    y={getY(activeEntryPrice) + 4}
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    ENTRADA ${activeEntryPrice.toFixed(1)}
                  </text>
                </g>
              )}
            </g>
          )}

          {/* CURRENT MARKET PRICE LINE (Solid with High-Contrast Badge) */}
          {currentPrice > 0 && (
            <g>
              <line
                x1="0"
                y1={getY(currentPrice)}
                x2={candleAreaWidth}
                y2={getY(currentPrice)}
                stroke="#f1f5f9"
                strokeWidth="1.2"
              />
              <rect
                x={candleAreaWidth + 2}
                y={getY(currentPrice) - 10}
                width={rightAxisWidth - 4}
                height={20}
                fill="#1e293b"
                stroke="#475569"
                strokeWidth="1"
                rx="3"
              />
              <text
                x={candleAreaWidth + 6}
                y={getY(currentPrice) + 4}
                fill="#ffffff"
                fontSize="10"
                fontWeight="bold"
                fontFamily="JetBrains Mono, monospace"
              >
                ${currentPrice.toFixed(2)}
              </text>
            </g>
          )}

          {/* INTERACTIVE CROSSHAIR */}
          {mousePos && (
            <g pointerEvents="none">
              {/* Vertical Crosshair Line */}
              <line
                x1={mousePos.x}
                y1="0"
                x2={mousePos.x}
                y2={chartHeight + volumeHeight}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* Horizontal Crosshair Line */}
              {mousePos.y <= chartHeight && (
                <line
                  x1="0"
                  y1={mousePos.y}
                  x2={candleAreaWidth}
                  y2={mousePos.y}
                  stroke="#64748b"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              )}

              {/* Crosshair Price Badge on Right Axis */}
              {hoveredPrice !== null && (
                <g>
                  <rect
                    x={candleAreaWidth + 2}
                    y={mousePos.y - 9}
                    width={rightAxisWidth - 4}
                    height={18}
                    fill="#0284c7"
                    rx="2"
                  />
                  <text
                    x={candleAreaWidth + 6}
                    y={mousePos.y + 4}
                    fill="#ffffff"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    ${hoveredPrice.toFixed(2)}
                  </text>
                </g>
              )}

              {/* Time Badge on Bottom Axis */}
              {activeCandle && (
                <g>
                  <rect
                    x={Math.max(4, Math.min(candleAreaWidth - 70, mousePos.x - 35))}
                    y={chartHeight + volumeHeight + 4}
                    width="70"
                    height="16"
                    fill="#1e293b"
                    rx="2"
                  />
                  <text
                    x={Math.max(4, Math.min(candleAreaWidth - 70, mousePos.x - 35)) + 35}
                    y={chartHeight + volumeHeight + 15}
                    fill="#e2e8f0"
                    fontSize="9"
                    textAnchor="middle"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {new Date(activeCandle.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </text>
                </g>
              )}
            </g>
          )}
        </svg>

        {/* BOTTOM TIMELINE LABELS */}
        <div className="flex justify-between text-[10px] font-mono text-slate-500 px-3 py-1 border-t border-slate-900">
          {displayCandles.filter((_, i) => i % Math.max(5, Math.floor(candleCount / 6)) === 0).map((c) => (
            <span key={`time-${c.time}`}>
              {new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ))}
        </div>
      </div>

      {/* 4. BOTTOM LEGEND & QUICK TOGGLES */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono pt-1 text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-white inline-block rounded-xs" />
            <span className="text-slate-300">Preço Atual</span>
          </div>

          {showBotTargets && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-cyan-400 inline-block border-b border-dashed" />
                <span className="text-cyan-300">Gatilho Compra na Baixa</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-400 inline-block border-b border-dashed" />
                <span className="text-emerald-300">Alvo Lucro (Take Profit)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-red-400 inline-block border-b border-dashed" />
                <span className="text-red-300">Alvo Stop Loss</span>
              </div>
            </>
          )}

          {showEma20 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-amber-400 inline-block rounded-xs" />
              <span className="text-amber-300">EMA 20</span>
            </div>
          )}

          {showEma50 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-indigo-400 inline-block rounded-xs" />
              <span className="text-indigo-300">EMA 50</span>
            </div>
          )}

          {showBollinger && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-blue-500 inline-block rounded-xs" />
              <span className="text-blue-300">Bandas de Bollinger</span>
            </div>
          )}
        </div>

        {/* Visible Candle Counter */}
        <div className="text-[10px] text-slate-500">
          Visualizando {displayCandles.length} velas · Escala Auto
        </div>
      </div>
    </div>
  );
};
