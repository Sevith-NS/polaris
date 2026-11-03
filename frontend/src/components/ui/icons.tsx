/**
 * Polaris's icon set: a few functional glyphs in an iOS-style outline, 24px
 * grid, 1.5px stroke, round ends. The design rule is text labels first; an
 * icon appears only where it does a job (close, search, menu, direction,
 * refresh, a tool).
 *
 * Paths are from Iconoir 7.12.1 (https://iconoir.com), MIT License,
 * Copyright (c) 2021 Luca Burgio. Shared stroke attributes live on <svg>.
 *
 * Exported under the names the codebase used with lucide-react, so swapping
 * the import is the only change a component needs. Names that were purely
 * decorative render nothing; delete those usages as each screen is rebuilt.
 */
import type { SVGProps } from 'react';

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & {
  size?: number | string;
  strokeWidth?: number;
};

function glyph(name: string, body: React.ReactNode) {
  function Icon({ size = 16, strokeWidth = 1.5, className, ...rest }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={className}
        {...rest}
      >
        {body}
      </svg>
    );
  }
  Icon.displayName = name;
  return Icon;
}

function blank(name: string) {
  function Decorative(props: IconProps): null {
    void props;
    return null;
  }
  Decorative.displayName = name;
  return Decorative;
}

export const Search = glyph('Search', <><path d="M17 17L21 21" /><path d="M3 11C3 15.4183 6.58172 19 11 19C13.213 19 15.2161 18.1015 16.6644 16.6493C18.1077 15.2022 19 13.2053 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11Z" /></>);
export const SearchX = Search;
export const X = glyph('X', <path d="M6.75827 17.2426L12.0009 12M17.2435 6.75736L12.0009 12M12.0009 12L6.75827 6.75736M12.0009 12L17.2435 17.2426" />);
export const ChevronDown = glyph('ChevronDown', <path d="M6 9L12 15L18 9" />);
export const ArrowRight = glyph('ArrowRight', <path d="M3 12L21 12M21 12L12.5 3.5M21 12L12.5 20.5" />);
export const ArrowUpRight = glyph('ArrowUpRight', <path d="M6.00005 19L19 5.99996M19 5.99996V18.48M19 5.99996H6.52005" />);
export const ArrowDownRight = glyph('ArrowDownRight', <path d="M6.00005 6.00004L19 19M19 19V6.52004M19 19H6.52005" />);
export const TrendingUp = ArrowUpRight;
export const TrendingDown = ArrowDownRight;
export const Send = ArrowRight;
export const ExternalLink = glyph('ExternalLink', <><path d="M21 3L15 3M21 3L12 12M21 3V9" /><path d="M21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H11" /></>);
export const RefreshCw = glyph('RefreshCw', <><path d="M21.8883 13.5C21.1645 18.3113 17.013 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C16.1006 2 19.6248 4.46819 21.1679 8" /><path d="M17 8H21.4C21.7314 8 22 7.73137 22 7.4V3" /></>);
export const Minus = glyph('Minus', <path d="M6 12H18" />);
export const Play = glyph('Play', <path d="M6.90588 4.53682C6.50592 4.2998 6 4.58808 6 5.05299V18.947C6 19.4119 6.50592 19.7002 6.90588 19.4632L18.629 12.5162C19.0211 12.2838 19.0211 11.7162 18.629 11.4838L6.90588 4.53682Z" />);
export const Square = glyph('Square', <path d="M21 3.6V20.4C21 20.7314 20.7314 21 20.4 21H3.6C3.26863 21 3 20.7314 3 20.4V3.6C3 3.26863 3.26863 3 3.6 3H20.4C20.7314 3 21 3.26863 21 3.6Z" />);
export const SlidersHorizontal = glyph('SlidersHorizontal', <><path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" /><path d="M19.6224 10.3954L18.5247 7.7448L20 6L18 4L16.2647 5.48295L13.5578 4.36974L12.9353 2H10.981L10.3491 4.40113L7.70441 5.51596L6 4L4 6L5.45337 7.78885L4.3725 10.4463L2 11V13L4.40111 13.6555L5.51575 16.2997L4 18L6 20L7.79116 18.5403L10.397 19.6123L11 22H13L13.6045 19.6132L16.2551 18.5155C16.6969 18.8313 18 20 18 20L20 18L18.5159 16.2494L19.6139 13.598L21.9999 12.9772L22 11L19.6224 10.3954Z" /></>);
export const Crosshair = glyph('Crosshair', <><path d="M12 19C15.866 19 19 15.866 19 12C19 8.13401 15.866 5 12 5C8.13401 5 5 8.13401 5 12C5 15.866 8.13401 19 12 19Z" /><path d="M12 19V21" /><path d="M5 12H3" /><path d="M12 5V3" /><path d="M19 12H21" /></>);
export const Ruler = glyph('Ruler', <path d="M16 7V2.6C16 2.26863 15.7314 2 15.4 2H8.6C8.26863 2 8 2.26863 8 2.6V21.4C8 21.7314 8.26863 22 8.6 22H15.4C15.7314 22 16 21.7314 16 21.4V17M16 7H13M16 7V12M16 12H13M16 12V17M16 17H13" />);
export const SplitSquareHorizontal = glyph('SplitSquareHorizontal', <path d="M12 3H20.4C20.7314 3 21 3.26863 21 3.6V20.4C21 20.7314 20.7314 21 20.4 21H12M12 3H3.6C3.26863 3 3 3.26863 3 3.6V20.4C3 20.7314 3.26863 21 3.6 21H12M12 3V21" />);
export const Layers = glyph('Layers', <><path d="M15 4V2M15 4V6M15 4H10.5M3 10V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V10H3Z" /><path d="M3 10V6C3 4.89543 3.89543 4 5 4H7" /><path d="M7 2V6" /><path d="M21 10V6C21 4.89543 20.1046 4 19 4H18.5" /></>);

export const AlertTriangle = glyph('AlertTriangle', <><path d="M20.0429 21H3.95705C2.41902 21 1.45658 19.3364 2.22324 18.0031L10.2662 4.01533C11.0352 2.67792 12.9648 2.67791 13.7338 4.01532L21.7768 18.0031C22.5434 19.3364 21.581 21 20.0429 21Z" /><path d="M12 9V13" /><path d="M12 17.01L12.01 16.9989" /></>);
export const WifiOff = AlertTriangle;
export const CheckCircle2 = glyph('CheckCircle2', <><path d="M7 12.5L10 15.5L17 8.5" /><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" /></>);
export const ShieldCheck = CheckCircle2;

export const ChevronRight = glyph('ChevronRight', <path d="M9 6L15 12L9 18" />);

// Navigation glyphs (shell only). Separate names, because the matching lucide
// names above are deliberately blank wherever they were decorative.
export const NavHome = glyph('NavHome', <path d="M9 21H7C4.79086 21 3 19.2091 3 17V10.7076C3 9.30887 3.73061 8.01175 4.92679 7.28679L9.92679 4.25649C11.2011 3.48421 12.7989 3.48421 14.0732 4.25649L19.0732 7.28679C20.2694 8.01175 21 9.30887 21 10.7076V17C21 19.2091 19.2091 21 17 21H15M9 21V17C9 15.3431 10.3431 14 12 14V14C13.6569 14 15 15.3431 15 17V21M9 21H15" />);
export const NavMarkets = glyph('NavMarkets', <><path d="M5 16V14" /><path d="M12 21V19" /><path d="M19 13V11" /><path d="M5 8V6" /><path d="M12 13V11" /><path d="M19 5V3" /><path d="M7 8.6V13.4C7 13.7314 6.73137 14 6.4 14H3.6C3.26863 14 3 13.7314 3 13.4V8.6C3 8.26863 3.26863 8 3.6 8H6.4C6.73137 8 7 8.26863 7 8.6Z" /><path d="M14 13.6V18.4C14 18.7314 13.7314 19 13.4 19H10.6C10.2686 19 10 18.7314 10 18.4V13.6C10 13.2686 10.2686 13 10.6 13H13.4C13.7314 13 14 13.2686 14 13.6Z" /><path d="M21 5.6V10.4C21 10.7314 20.7314 11 20.4 11H17.6C17.2686 11 17 10.7314 17 10.4V5.6C17 5.26863 17.2686 5 17.6 5H20.4C20.7314 5 21 5.26863 21 5.6Z" /></>);
export const NavPortfolio = glyph('NavPortfolio', <path d="M8 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7H16M8 7V3.6C8 3.26863 8.26863 3 8.6 3H15.4C15.7314 3 16 3.26863 16 3.6V7M8 7H16" />);
export const NavWatchlists = glyph('NavWatchlists', <path d="M8.58737 8.23597L11.1849 3.00376C11.5183 2.33208 12.4817 2.33208 12.8151 3.00376L15.4126 8.23597L21.2215 9.08017C21.9668 9.18848 22.2638 10.0994 21.7243 10.6219L17.5217 14.6918L18.5135 20.4414C18.6409 21.1798 17.8614 21.7428 17.1945 21.3941L12 18.678L6.80547 21.3941C6.1386 21.7428 5.35909 21.1798 5.48645 20.4414L6.47825 14.6918L2.27575 10.6219C1.73617 10.0994 2.03322 9.18848 2.77852 9.08017L8.58737 8.23597Z" />);
export const NavNews = glyph('NavNews', <><path d="M6 6L18 6" /><path d="M6 10H18" /><path d="M13 14L18 14" /><path d="M13 18L18 18" /><path d="M2 21.4V2.6C2 2.26863 2.26863 2 2.6 2H21.4C21.7314 2 22 2.26863 22 2.6V21.4C22 21.7314 21.7314 22 21.4 22H2.6C2.26863 22 2 21.7314 2 21.4Z" /><path d="M6 18V14H9V18H6Z" /></>);
export const NavSettings = glyph('NavSettings', <><path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" /><path d="M19.6224 10.3954L18.5247 7.7448L20 6L18 4L16.2647 5.48295L13.5578 4.36974L12.9353 2H10.981L10.3491 4.40113L7.70441 5.51596L6 4L4 6L5.45337 7.78885L4.3725 10.4463L2 11V13L4.40111 13.6555L5.51575 16.2997L4 18L6 20L7.79116 18.5403L10.397 19.6123L11 22H13L13.6045 19.6132L16.2551 18.5155C16.6969 18.8313 18 20 18 20L20 18L18.5159 16.2494L19.6139 13.598L21.9999 12.9772L22 11L19.6224 10.3954Z" /></>);
export const NavAlerts = glyph('NavAlerts', <><path d="M18 8.4C18 6.70261 17.3679 5.07475 16.2426 3.87452C15.1174 2.67428 13.5913 2 12 2C10.4087 2 8.88258 2.67428 7.75736 3.87452C6.63214 5.07475 6 6.70261 6 8.4C6 15.8667 3 18 3 18H21C21 18 18 15.8667 18 8.4Z" /><path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" /></>);
export const NavMore = glyph('NavMore', <><path d="M20 12.5C20.2761 12.5 20.5 12.2761 20.5 12C20.5 11.7239 20.2761 11.5 20 11.5C19.7239 11.5 19.5 11.7239 19.5 12C19.5 12.2761 19.7239 12.5 20 12.5Z" fill="currentColor" /><path d="M12 12.5C12.2761 12.5 12.5 12.2761 12.5 12C12.5 11.7239 12.2761 11.5 12 11.5C11.7239 11.5 11.5 11.7239 11.5 12C11.5 12.2761 11.7239 12.5 12 12.5Z" fill="currentColor" /><path d="M4 12.5C4.27614 12.5 4.5 12.2761 4.5 12C4.5 11.7239 4.27614 11.5 4 11.5C3.72386 11.5 3.5 11.7239 3.5 12C3.5 12.2761 3.72386 12.5 4 12.5Z" fill="currentColor" /></>);

export const ArrowUpToLine = glyph('ArrowUpToLine', <><path d="M6 20L18 20" /><path d="M12 16V4M12 4L15.5 7.5M12 4L8.5 7.5" /></>);
export const ArrowDownToLine = glyph('ArrowDownToLine', <><path d="M6 20L18 20" /><path d="M12 4V16M12 16L15.5 12.5M12 16L8.5 12.5" /></>);
export const Check = glyph('Check', <path d="M5 13L9 17L19 7" />);
export const Trash2 = glyph('Trash2', <><path d="M20 9L18.005 20.3463C17.8369 21.3026 17.0062 22 16.0353 22H7.96474C6.99379 22 6.1631 21.3026 5.99496 20.3463L4 9" /><path d="M21 6L15.375 6M3 6L8.625 6M8.625 6V4C8.625 2.89543 9.52043 2 10.625 2H13.375C14.4796 2 15.375 2.89543 15.375 4V6M8.625 6L15.375 6" /></>);
export const Eye = glyph('Eye', <><path d="M3 13C6.6 5 17.4 5 21 13" /><path d="M12 17C10.3431 17 9 15.6569 9 14C9 12.3431 10.3431 11 12 11C13.6569 11 15 12.3431 15 14C15 15.6569 13.6569 17 12 17Z" /></>);
export const MousePointer2 = glyph('MousePointer2', <path fillRule="evenodd" clipRule="evenodd" d="M19.5027 9.96958C20.7073 10.4588 20.6154 12.1941 19.3658 12.5533L13.0605 14.3658L10.1807 20.2606C9.60996 21.4288 7.88499 21.218 7.6124 19.9468L4.67677 6.25646C4.44638 5.18204 5.5121 4.2878 6.53019 4.70126L19.5027 9.96958Z" />);
export const MoveUpRight = glyph('MoveUpRight', <path d="M3 20L21 4" />);
export const Rows3 = glyph('Rows3', <><path d="M3 6H21" /><path d="M3 10H21" /><path d="M3 14H21" /><path d="M3 18H21" /></>);
export const Eraser = glyph('Eraser', <><path d="M21 21L9 21" /><path d="M15.889 14.8891L8.46436 7.46448" /><path d="M2.8934 12.6066L12.0858 3.41421C12.8668 2.63317 14.1332 2.63317 14.9142 3.41421L19.864 8.36396C20.645 9.14501 20.645 10.4113 19.864 11.1924L10.6213 20.435C10.2596 20.7968 9.76894 21 9.25736 21C8.74577 21 8.25514 20.7968 7.8934 20.435L2.8934 15.435C2.11235 14.654 2.11235 13.3877 2.8934 12.6066Z" /></>);
export const CircleDot = glyph('CircleDot', <><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" /><path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" /></>);
// Ask Polaris: show or hide the chats pane, and start a new chat.
export const PanelLeft = glyph('PanelLeft', <><path d="M19 21L5 21C3.89543 21 3 20.1046 3 19L3 5C3 3.89543 3.89543 3 5 3L19 3C20.1046 3 21 3.89543 21 5L21 19C21 20.1046 20.1046 21 19 21Z" /><path d="M7.25 10L5.5 12L7.25 14" /><path d="M9.5 21V3" /></>);
export const SquarePen = glyph('SquarePen', <><path d="M20 12V5.74853C20 5.5894 19.9368 5.43679 19.8243 5.32426L16.6757 2.17574C16.5632 2.06321 16.4106 2 16.2515 2H4.6C4.26863 2 4 2.26863 4 2.6V21.4C4 21.7314 4.26863 22 4.6 22H11" /><path d="M8 10H16M8 6H12M8 14H11" /><path d="M17.9541 16.9394L18.9541 15.9394C19.392 15.5015 20.102 15.5015 20.5399 15.9394V15.9394C20.9778 16.3773 20.9778 17.0873 20.5399 17.5252L19.5399 18.5252M17.9541 16.9394L14.963 19.9305C14.8131 20.0804 14.7147 20.2741 14.6821 20.4835L14.4394 22.0399L15.9957 21.7973C16.2052 21.7646 16.3988 21.6662 16.5487 21.5163L19.5399 18.5252M17.9541 16.9394L19.5399 18.5252" /><path d="M16 2V5.4C16 5.73137 16.2686 6 16.6 6H20" /></>);
export const Settings2 = SlidersHorizontal;

// Decorative in every current usage: render nothing.
export const Building2 = blank('Building2');
export const Calculator = blank('Calculator');
export const History = blank('History');
export const Microscope = blank('Microscope');
export const Receipt = blank('Receipt');
export const Shuffle = blank('Shuffle');
export const Target = blank('Target');
export const Timer = blank('Timer');
export const Zap = blank('Zap');
export const BookOpen = blank('BookOpen');
export const BrainCircuit = blank('BrainCircuit');
export const CalendarClock = blank('CalendarClock');
export const CandlestickChart = blank('CandlestickChart');
export const Dices = blank('Dices');
export const FileSearch = blank('FileSearch');
export const FlaskConical = blank('FlaskConical');
export const Footprints = blank('Footprints');
export const Handshake = blank('Handshake');
export const Landmark = blank('Landmark');
export const ListOrdered = blank('ListOrdered');
export const Newspaper = blank('Newspaper');
export const Quote = blank('Quote');
export const Scale = blank('Scale');
export const Sparkles = blank('Sparkles');
export const Swords = blank('Swords');
export const Users = blank('Users');
export const Users2 = blank('Users2');
export const Waves = blank('Waves');
