# meadows — Design (QFD)

Goal-driven design for the **meadows** editor, phase 1 (diagram; numeric
simulation is a later phase). Scope: data model, canvas/rendering, interaction
model, and persistence for building stock-and-flow **Models**. It relies on
[CONTEXT.md](./CONTEXT.md) for vocabulary and
[ADR-0001](./docs/adr/0001-detected-feedback-loops.md) (loops detected from a
polarity-annotated graph, not stored). "Simulation-ready" is a constraint here,
not a goal: nothing in the data model should need a rewrite when simulation lands.
See [README.md](./README.md) for the project overview and how to run it.

Strength weights used in matrices: **9** strong, **3** medium, **1** weak, blank none.

---

## House of Quality (visual)

One picture of §1 (Goals, left), §2 (Functions, top), §4 (relation matrix, body),
§5 (roof, correlations) and §7/§4 (basement: targets + importance Σ + relative %).
The tables below stay authoritative — regenerate this when they change. Relation
symbols: ● strong (9) · ◐ medium (3) · △ weak (1). Roof: `++`/`+` reinforce,
`−`/`−−` conflict.

```tikz
% =====================================================================
% QFD "House of Quality" preamble
% =====================================================================
\usetikzlibrary{arrows.meta, positioning, shapes.geometric, shapes.misc, calc, fit, backgrounds}

% Toggles — flip before \begin{qfdhouse} to hide sections.
\newif\ifqfdshowroof          \qfdshowrooftrue
\newif\ifqfdshowbasement      \qfdshowbasementtrue
\newif\ifqfdshowcompetitive   \qfdshowcompetitivetrue
\newif\ifqfdshowlegend        \qfdshowlegendtrue
\newif\ifqfdshowimportance    \qfdshowimportancetrue
\newif\ifqfdshowcorrlegend    \qfdshowcorrlegendtrue
\newif\ifqfdshowevallegend    \qfdshowevallegendtrue

% Dimensions — override before \begin{qfdhouse} to resize.
\def\qfdNW{5}           % number of WHATs (rows)
\def\qfdNH{5}           % number of HOWs (columns)
\def\qfdWhatW{4.0}      % width of WHATs column
\def\qfdImpW{0.9}       % width of importance column
\def\qfdCmpW{3}         % width of perception zone
\def\qfdHdrH{2.6}       % height of column-titles band
\def\qfdBasementN{4}    % number of basement rows

% Titles & labels — override before \begin{qfdhouse}.
\def\qfdWhatsTitle{Customer needs}
\def\qfdImpTitle{Imp.\ \%}
\def\qfdPerceptionTitle{Comparative evaluation}
\def\qfdPoorLabel{poor}
\def\qfdExcellentLabel{excellent}
\def\qfdAltOneLabel{Our product}    % highlighted in legend
\def\qfdAltTwoLabel{Competitor A}
\def\qfdAltThreeLabel{Competitor B}
\def\qfdRelTitle{Relation}
\def\qfdCorrTitle{Correlation}
\def\qfdEvalTitle{Evaluation}

% Styles.
\tikzset{
  qfdthin/.style ={line width=0.35pt},
  qfdmed/.style  ={line width=0.7pt},
  qfdstrong/.style={circle, draw, fill=black,
                    minimum size=7pt, inner sep=0pt},
  qfdmod/.style  ={circle, draw,
                    minimum size=7pt, inner sep=0pt, line width=0.8pt},
  qfdweak/.style ={regular polygon, regular polygon sides=3, draw,
                    minimum size=8.5pt, inner sep=0pt, line width=0.7pt},
  qfdrel/.is choice,
  qfdrel/S/.style={qfdstrong},
  qfdrel/M/.style={qfdmod},
  qfdrel/W/.style={qfdweak},
  % Three perception-zone alternatives. Index 1 is emphasised.
  qfdalt1mk/.style={circle, draw, fill=black,
                    minimum size=6pt, inner sep=0pt, line width=1pt},
  qfdalt1ln/.style={line width=1.2pt},
  qfdalt2mk/.style={regular polygon, regular polygon sides=3, draw,
                    fill=black, minimum size=6pt, inner sep=0pt,
                    line width=0.7pt},
  qfdalt2ln/.style={line width=0.7pt, dashed},
  qfdalt3mk/.style={rectangle, draw, fill=black,
                    minimum size=5pt, inner sep=0pt, line width=0.7pt},
  qfdalt3ln/.style={line width=0.7pt, dotted},
}

% --- Grid lines for every zone. ---
\newcommand{\qfdDrawGrid}{%
  \foreach \c in {1,...,\qfdNHm} \draw[qfdthin] (\c, 0) -- (\c, -\qfdNW);
  \foreach \r in {1,...,\qfdNWm} \draw[qfdthin] (0, -\r) -- (\qfdNH, -\r);
  \foreach \r in {1,...,\qfdNWm}
    \draw[qfdthin] (\qfdLeftEdge, -\r) -- (0, -\r);
  \ifqfdshowroof
    \foreach \c in {1,...,\qfdNHm}
      \draw[qfdthin] (\c, 0) -- (\c, \qfdHdrH);
  \fi
  \ifqfdshowcompetitive
    \foreach \r in {1,...,\qfdNWm}
      \draw[qfdthin] (\qfdNH, -\r) -- (\qfdNH+\qfdCmpW, -\r);
  \fi
  \ifqfdshowbasement
    \foreach \r in {1,...,\qfdBasementN}
      \draw[qfdthin] (0, -\qfdNW-\r) -- (\qfdNH, -\qfdNW-\r);
    \foreach \c in {1,...,\qfdNHm}
      \draw[qfdthin] (\c, -\qfdNW) -- (\c, -\qfdNW-\qfdBasementN);
  \fi
}

% --- Roof: diagonal grid + named coordinates (C-i-j) for correlations. ---
\newcommand{\qfdDrawRoof}{%
  \ifqfdshowroof
    \foreach \k in {1,...,\qfdNHm} {%
      \pgfmathsetmacro{\rx}{(\k+\qfdNH)/2}
      \pgfmathsetmacro{\ry}{\qfdHdrH + (\qfdNH-\k)/2}
      \pgfmathsetmacro{\lx}{\k/2}
      \pgfmathsetmacro{\ly}{\qfdHdrH + \k/2}
      \draw[qfdthin] (\k, \qfdHdrH) -- (\rx, \ry);
      \draw[qfdthin] (\k, \qfdHdrH) -- (\lx, \ly);
    }%
    \draw[qfdmed] (0, \qfdHdrH)
       -- (\qfdNH/2, \qfdApexY) -- (\qfdNH, \qfdHdrH);
    \foreach \i in {1,...,\qfdNH}
      \foreach \k in {1,...,\qfdNH} {%
        \pgfmathtruncatemacro{\jj}{\i+\k}
        \ifnum\jj>\qfdNH\relax\else
          \pgfmathsetmacro{\xx}{\i + \k/2 - 0.5}
          \pgfmathsetmacro{\yy}{\qfdHdrH + \k/2}
          \coordinate (C-\i-\jj) at (\xx, \yy);
        \fi
      }%
  \fi
}

% --- Perception scale 0..5 + poor/excellent endpoints + zone title. ---
\newcommand{\qfdDrawScale}{%
  \ifqfdshowcompetitive
    \foreach \tk in {0,1,2,3,4,5} {%
      \pgfmathsetmacro{\tx}{\qfdNH + (\tk+0.5)*\qfdCmpW/6}
      \node[anchor=south, font=\scriptsize] at (\tx, 0.02) {\tk};
    }%
    \node[anchor=south, font=\scriptsize\bfseries, align=center]
         at ({\qfdNH + \qfdCmpW/2}, 0.7) {\qfdPerceptionTitle};
    \node[anchor=north, font=\scriptsize\itshape]
         at ({\qfdNH + 0.45}, -\qfdNW) {\qfdPoorLabel};
    \node[anchor=north, font=\scriptsize\itshape]
         at ({\qfdNH + \qfdCmpW - 0.45}, -\qfdNW) {\qfdExcellentLabel};
  \fi
}

% --- Importance title (left) and WHATs title (header band). ---
\newcommand{\qfdDrawZoneTitles}{%
  \ifqfdshowimportance
    \node[rotate=90, anchor=west, font=\footnotesize\bfseries]
         at ({-\qfdImpW/2}, 0.12) {\qfdImpTitle};
  \fi
  \node[font=\scriptsize\bfseries, align=center, text width=\qfdWhatW cm]
       at ({\qfdLeftEdge + \qfdWhatW/2},
           {\ifqfdshowroof \qfdHdrH/2 \else 0.6 \fi}) {\qfdWhatsTitle};
}

% --- Outer frames around each zone. ---
\newcommand{\qfdDrawFrames}{%
  \begin{scope}[qfdmed]
    \draw (\qfdLeftEdge, 0) rectangle (\qfdNH, -\qfdNW);
    \ifqfdshowimportance \draw (-\qfdImpW, 0) -- (-\qfdImpW, -\qfdNW); \fi
    \draw (0, 0) -- (0, -\qfdNW);
    \ifqfdshowroof
      \draw (0, 0) rectangle (\qfdNH, \qfdHdrH); \fi
    \ifqfdshowbasement
      \draw (0, -\qfdNW) rectangle (\qfdNH, -\qfdNW-\qfdBasementN); \fi
    \ifqfdshowcompetitive
      \draw (\qfdNH, 0) rectangle (\qfdNH+\qfdCmpW, -\qfdNW); \fi
  \end{scope}
}

% --- Legend on the right (Relations / Correlations / Evaluation). ---
\newcommand{\qfdDrawLegend}{%
  \ifqfdshowlegend
    \pgfmathsetmacro{\qfdLegX}{%
      \qfdNH + \ifqfdshowcompetitive \qfdCmpW + 0.7 \else 0.7 \fi}
    \pgfmathsetmacro{\qfdLegBottom}{%
      -2.05
      \ifqfdshowroof    \ifqfdshowcorrlegend - 2.55 \fi \fi
      \ifqfdshowcompetitive \ifqfdshowevallegend - 2.20 \fi \fi}
    \pgfmathsetmacro{\qfdLegY}{\qfdHdrH - 0.4}
    \begin{scope}[shift={(\qfdLegX, \qfdLegY)}]
      \draw[qfdmed, rounded corners=2pt]
        (-0.15, 0.4) rectangle (4.5, \qfdLegBottom);
      % Relations
      \node[anchor=west, font=\footnotesize\bfseries] at (0, 0.1)
        {\qfdRelTitle};
      \draw[qfdthin] (0, -0.15) -- (4.35, -0.15);
      \node[qfdstrong] at (0.22, -0.5)  {};
        \node[anchor=west] at (0.5, -0.5)  {Strong (9)};
      \node[qfdmod]    at (0.22, -0.95) {};
        \node[anchor=west] at (0.5, -0.95) {Medium (3)};
      \node[qfdweak]   at (0.22, -1.4)  {};
        \node[anchor=west] at (0.5, -1.4)  {Weak (1)};
      % Correlations (roof)
      \ifqfdshowroof \ifqfdshowcorrlegend
        \node[anchor=west, font=\footnotesize\bfseries] at (0, -2.10)
          {\qfdCorrTitle};
        \draw[qfdthin] (0, -2.35) -- (4.35, -2.35);
        \node[anchor=west] at (0, -2.70) {{$+\!+$}\quad very positive};
        \node[anchor=west] at (0, -3.05) {{$+$\phantom{$+$}}\quad positive};
        \node[anchor=west] at (0, -3.40) {{$-$\phantom{$-$}}\quad negative};
        \node[anchor=west] at (0, -3.75) {{$-\!-$}\quad very negative};
      \fi \fi
      % Evaluation (3 alternatives)
      \ifqfdshowcompetitive \ifqfdshowevallegend
        \pgfmathsetmacro{\qfdEvalTop}{%
          -2.10 \ifqfdshowroof\ifqfdshowcorrlegend - 2.55 \fi\fi}
        \node[anchor=west, font=\footnotesize\bfseries]
          at (0, \qfdEvalTop) {\qfdEvalTitle};
        \pgfmathsetmacro{\qfdEvalSep}{\qfdEvalTop - 0.25}
        \draw[qfdthin] (0, \qfdEvalSep) -- (4.35, \qfdEvalSep);
        \pgfmathsetmacro{\qfdLegA}{\qfdEvalTop - 0.55}
        \draw[qfdalt1ln] (0.05, \qfdLegA) -- (0.45, \qfdLegA);
          \node[qfdalt1mk] at (0.25, \qfdLegA) {};
          \node[anchor=west, font=\bfseries] at (0.55, \qfdLegA)
            {\qfdAltOneLabel};
        \pgfmathsetmacro{\qfdLegB}{\qfdEvalTop - 0.95}
        \draw[qfdalt2ln] (0.05, \qfdLegB) -- (0.45, \qfdLegB);
          \node[qfdalt2mk] at (0.25, \qfdLegB) {};
          \node[anchor=west] at (0.55, \qfdLegB) {\qfdAltTwoLabel};
        \pgfmathsetmacro{\qfdLegC}{\qfdEvalTop - 1.35}
        \draw[qfdalt3ln] (0.05, \qfdLegC) -- (0.45, \qfdLegC);
          \node[qfdalt3mk] at (0.25, \qfdLegC) {};
          \node[anchor=west] at (0.55, \qfdLegC) {\qfdAltThreeLabel};
      \fi \fi
    \end{scope}
  \fi
}

% --- The environment users wrap their content in. ---
\newenvironment{qfdhouse}{%
  \begin{tikzpicture}[x=1cm, y=1cm, font=\scriptsize,
                      line cap=round, line join=round]
  \ifqfdshowimportance
    \pgfmathsetmacro{\qfdLeftEdge}{-\qfdWhatW-\qfdImpW}
  \else
    \pgfmathsetmacro{\qfdLeftEdge}{-\qfdWhatW}
  \fi
  \pgfmathsetmacro{\qfdApexY}{\qfdHdrH + \qfdNH/2}
  \pgfmathtruncatemacro{\qfdNHm}{\qfdNH - 1}
  \pgfmathtruncatemacro{\qfdNWm}{\qfdNW - 1}
  \qfdDrawGrid
  \qfdDrawRoof
  \qfdDrawScale
  \qfdDrawZoneTitles
}{%
  \qfdDrawFrames
  \qfdDrawLegend
  \end{tikzpicture}%
}

\begin{document}
% --- meadows: 3 goals (WHATs) x 9 functions (HOWs); no competitor zone;
%     basement = Target / Importance Sigma / Relative %. ---
\def\qfdNW{3}
\def\qfdNH{9}
\def\qfdWhatW{4.2}
\def\qfdBasementN{3}
\def\qfdWhatsTitle{Goals (WHATs)}
\def\qfdImpTitle{Weight}
\qfdshowcompetitivefalse
\begin{qfdhouse}
  % --- WHATs (goals) + importance weight ---
  \pgfmathsetmacro{\qfdWhatTextW}{\qfdWhatW - 0.2}
  \foreach \r/\t in {1/{G1 Build with near-zero friction},
                     2/{G2 Feedback surfaces as live insight},
                     3/{G3 Models safe \& portable}}
    \node[anchor=west, font=\scriptsize, text width=\qfdWhatTextW cm, align=left]
      at ({\qfdLeftEdge + 0.1}, {-\r + 0.5}) {\t};
  \foreach \r/\imp in {1/9, 2/8, 3/7}
    \node[font=\scriptsize] at ({-\qfdImpW/2}, {-\r + 0.5}) {\imp};

  % --- HOWs (functions, rotated) ---
  \foreach \c/\t in {1/{F1 place node}, 2/{F2 connect},
                     3/{F3 smooth canvas}, 4/{F4 valid inline},
                     5/{F5 loops live}, 6/{F6 polarity},
                     7/{F7 autosave}, 8/{F8 round-trip}, 9/{F9 undo/redo}}
    \node[rotate=90, anchor=west, font=\scriptsize] at ({\c - 0.5}, 0.15) {\t};

  % --- Relation matrix (col c = function, row r = goal); strength S/M/W ---
  \foreach \c/\r/\s in {1/1/S, 2/1/S, 3/1/S, 4/1/M, 5/1/W, 6/1/M, 7/1/W, 9/1/M,
                        2/2/M, 3/2/W, 4/2/M, 5/2/S, 6/2/S, 9/2/W,
                        4/3/W, 7/3/S, 8/3/S, 9/3/S}
    \node[qfdrel/\s] at ({\c - 0.5}, {-\r + 0.5}) {};

  % --- Roof correlations (C-i-j, i<j); from DESIGN.md §5 ---
  \node[font=\scriptsize] at (C-2-4) {$-$};      % F2 x F4 mild conflict
  \node[font=\scriptsize] at (C-2-6) {$+\!+$};   % F2 o F6 strong reinforce
  \node[font=\scriptsize] at (C-3-5) {$-\!-$};   % F3 x F5 strong conflict
  \node[font=\scriptsize] at (C-3-9) {$-$};      % F3 x F9 mild conflict
  \node[font=\scriptsize] at (C-4-5) {$+$};      % F4 o F5 mild reinforce
  \node[font=\scriptsize] at (C-5-6) {$+\!+$};   % F5 o F6 strong reinforce

  % --- Basement: Target / Importance Sigma / Relative %, + row labels ---
  \foreach \rr/\lbl in {0/{Target}, 1/{Imp.\ $\Sigma$}, 2/{Rel.\ \%}}
    \node[anchor=east, font=\scriptsize\itshape]
      at (-0.1, {-\qfdNW - 0.5 - \rr}) {\lbl};
  \foreach \c/\tgt/\sig/\rel in
    {1/{1 gest.}/81/11, 2/{1 drag}/105/14, 3/{60 fps}/89/12,
     4/{0 inv.}/58/8, 5/{$\le$16ms}/81/11, 6/{dflt $\pm$}/99/13,
     7/{$\le$500ms}/72/10, 8/{id.}/63/8, 9/{$\ge$50}/98/13} {
    \node[font=\scriptsize] at ({\c - 0.5}, {-\qfdNW - 0.5}) {\tgt};
    \node[font=\scriptsize] at ({\c - 0.5}, {-\qfdNW - 1.5}) {\sig};
    \node[font=\scriptsize\bfseries] at ({\c - 0.5}, {-\qfdNW - 2.5}) {\rel};
  }
\end{qfdhouse}
\end{document}
```

---

## 1. Goals — the WHATs

| ID  | Goal                                          | Weight | Source                          |
|-----|-----------------------------------------------|:------:|---------------------------------|
| G1  | Build a model with near-zero friction         |   9    | original request; CONTEXT.md    |
| G2  | Feedback structure surfaces as insight (live) |   8    | original request; ADR-0001      |
| G3  | Models are safe and portable                  |   7    | original request                |

## 2. Functions — the HOWs

| ID  | Function                                                              | Dir | Target (now)                         | Target (future)        |
|-----|----------------------------------------------------------------------|:---:|--------------------------------------|------------------------|
| F1  | Place a node in one gesture (palette → canvas, auto-named)            |  ↓  | 1 click/drag, 0 dialogs              | —                      |
| F2  | Connect by direct manipulation (auto source/sink cloud on open end)   |  ↓  | 1 drag, 0 menus                      | —                      |
| F3  | Render & manipulate the canvas smoothly                               |  ↑  | 60 fps pan/zoom/drag @ ≤150 elements | ≥300 elements          |
| F4  | Enforce valid structure inline                                        |  →  | 0 invalid models persistable         | —                      |
| F5  | Detect & classify loops live (R/B) on every structural change         |  ↓  | ≤16 ms recompute @ ≤150 elements     | ≤16 ms @ ≥300          |
| F6  | Capture link polarity frictionlessly                                  |  ↓  | default on create, 1-click toggle    | —                      |
| F7  | Autosave locally, continuously                                        |  →  | debounced ≤500 ms; survive reload    | —                      |
| F8  | Round-trip Models as versioned JSON                                   |  →  | export→import identity; `version`    | schema migrations      |
| F9  | Undo/redo every model change                                          |  ↑  | ≥50 steps, all structural ops        | —                      |

## 3. Cascade — Goals → Functions → How → Components

- **G1** Build a model with near-zero friction  _W:9_
  - **F1** Place a node in one gesture  _↓ 1 click/drag_
    - **How**: Vue Flow drag-from-palette → store action creates the node
      - **Component**: C1 Vue Flow canvas · C2 custom node components · C6 projection
  - **F2** Connect by direct manipulation (auto cloud on open end)  _↓ 1 drag_
    - **How**: drag from a node handle; open end auto-spawns a Cloud
      - **Component**: C2 node handles · C3 edge components · C5 store actions · C7 structure guard
  - **F3** Render & manipulate smoothly  _↑ 60 fps @ ≤150_
    - **How**: Vue Flow viewport (GPU transforms); Model→VueFlow projection memoised
      - **Component**: C1 Vue Flow canvas · C6 projection
  - **F9** Undo/redo  _↑ ≥50 steps_
    - **How**: ring buffer of deep-cloned Model snapshots in the store
      - **Component**: C5 model store (history)
- **G2** Feedback structure surfaces as insight (live)  _W:8_
  - **F5** Detect & classify loops live  _↓ ≤16 ms @ ≤150_
    - **How**: derive directed graph → Tarjan SCC → capped Johnson → polarity product (R/B)
    - **How**: SCC-only — _rejected (loses per-loop insight), see T3_
      - **Component**: C8 loop engine · C11 loop overlay
  - **F6** Capture link polarity frictionlessly  _↓ default + toggle_
    - **How**: InfoLink defaults to `+` on create; 1-click `+/−` toggle on the edge badge
      - **Component**: C3 edge components · C5 store actions
  - **F4** Enforce valid structure inline  _→ 0 invalid persistable_
    - **How**: guard *guides* (disallow invalid handle targets) rather than erroring after
      - **Component**: C7 structure guard · C4 domain types
- **G3** Models are safe and portable  _W:7_
  - **F7** Autosave locally, continuously  _→ ≤500 ms debounce_
    - **How**: store subscribes to Model changes → debounced `repository.save()`
      - **Component**: C5 store · C9 ModelRepository (IndexedDB/idb)
  - **F8** Round-trip Models as versioned JSON  _→ lossless_
    - **How**: serialise Model (`version` field) → download; import → validate → load
    - **How**: PouchDB/cloud sync — _deferred (needs a backend), see Tensions_
      - **Component**: C10 import/export · C4 domain types
  - **F9** (also serves G3 as a safety net) → C5 model store

## 4. House — Goals × Functions

Cells: strength 9/3/1. Importance Σ = Σ(weight × strength).

|          | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 | F9 |
|----------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| G1 (9)   | 9  | 9  | 9  | 3  | 1  | 3  | 1  |    | 3  |
| G2 (8)   |    | 3  | 1  | 3  | 9  | 9  |    |    | 1  |
| G3 (7)   |    |    |    | 1  |    |    | 9  | 9  | 9  |
| **Σ**    | 81 | 105| 89 | 58 | 81 | 99 | 72 | 63 | 98 |

**Top engineering priorities (from importance):** the matrix puts **F2 (connect, 105)**, **F6 (polarity, 99)** and **F9 (undo, 98)** above the headline detector **F5 (81)**. The lesson: loop insight is only as good as its *inputs* and *ergonomics* — getting wiring (F2) and polarity capture (F6) effortless matters as much as the detection itself, and a reliable safety net (F9) underwrites fearless building. F4 (58) is real but lowest-leverage — keep it lightweight (guide, don't nag).

## 5. Roof — Function × Function tradeoffs

`◎` strong reinforce · `○` mild reinforce · `×` mild conflict · `⊗` strong conflict.

|        | F2 | F3 | F4 | F5 | F6 | F9 |
|--------|:--:|:--:|:--:|:--:|:--:|:--:|
| **F2** | —  |    | ×  |    | ◎  |    |
| **F3** |    | —  |    | ⊗  |    | ×  |
| **F4** |    |    | —  | ○  |    |    |
| **F5** |    |    |    | —  | ◎  |    |
| **F6** |    |    |    |    | —  |    |
| **F9** |    |    |    |    |    | —  |

**Conflicts that actually shape the design:**
- **F5 ⊗ F3** — live loop enumeration on every change vs the 60 fps frame budget. The design-shaping conflict. Mitigated by the **cap** (≤200 cycles) + running detection **off the render frame** (debounce / idle callback / worker). Owned by ADR-0001 + the §7 budget.
- **F2 × F4** — guardrails can add friction to connecting. Mitigated by *guiding* the gesture (invalid handles refuse the drop) instead of erroring afterwards.
- **F3 × F9** — snapshot cloning on every change costs memory/time. Bounded by small models + a fixed-size ring buffer; revisit with structural sharing only if profiling demands.
- **F2 ◎ F6, F5 ◎ F6** — polarity is captured *in* the connect gesture and *is* the detector's input; these reinforce, so build them together.

## 6. Components & Function → Component map

| ID  | Component                                            | ADR      |
|-----|-----------------------------------------------------|----------|
| C1  | Vue Flow canvas (`@vue-flow/core` + addons)         | ADR-0002 |
| C2  | Custom node components (Stock/Flow/Converter/Cloud) | ADR-0002 |
| C3  | Custom edge components (InfoLink badge, Flow pipe)  | ADR-0002 |
| C4  | Domain `Model` + types (`model/types.ts`)           | ADR-0003 |
| C5  | Model store (Pinia) + snapshot history              | —        |
| C6  | Model ↔ Vue Flow projection (`projection.ts`)       | ADR-0002 |
| C7  | Structure guard (`validation.ts`)                   | ADR-0003 |
| C8  | Loop engine (`loops.ts`: SCC + capped Johnson)      | ADR-0001 |
| C9  | `ModelRepository` (IndexedDB via `idb`)             | —        |
| C10 | Import/Export (versioned JSON `io.ts`)              | —        |
| C11 | Loop overlay UI (R/B badges, hover highlight)       | ADR-0001 |
| C12 | Palette + chrome (DaisyUI toolbar, model list)      | —        |

|     | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 | C11 | C12 |
|-----|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:---:|:---:|:---:|
| F1  | 9  | 9  |    |    | 3  | 9  |    |    |    |     |     | 9   |
| F2  | 9  | 9  | 9  |    | 9  | 3  | 9  |    |    |     |     |     |
| F3  | 9  | 3  | 3  |    |    | 9  |    |    |    |     |     |     |
| F4  |    | 1  | 1  | 3  | 3  |    | 9  |    |    |     |     |     |
| F5  |    |    |    | 3  | 1  |    |    | 9  |    |     | 9   |     |
| F6  |    |    | 9  | 3  | 3  |    |    | 1  |    |     |     |     |
| F7  |    |    |    |    | 9  |    |    |    | 9  |     |     |     |
| F8  |    |    |    | 3  |    |    |    |    | 1  | 9   |     |     |
| F9  |    |    |    |    | 9  |    |    |    |    |     |     |     |

## 7. Critical performance budget

| Rank | Function | Target                     | Watched on                          | If we miss it                                              |
|------|----------|----------------------------|-------------------------------------|-----------------------------------------------------------|
| 1    | F5       | ≤16 ms recompute @ ≤150    | bench on synthetic dense graphs     | enforce cycle cap; move detection off-frame (idle/worker); debounce |
| 2    | F3       | 60 fps pan/zoom/drag @ ≤150| frame profiling in DevTools         | memoise projection; simplify node DOM; virtualise off-screen nodes |
| 3    | F2       | 1 drag, 0 menus            | manual UX walkthrough               | simplify handle model; reduce connect steps               |
| 4    | F7       | ≤500 ms debounce, 0 loss   | reload-after-edit integration test  | flush on `visibilitychange`/`beforeunload`                |
| 5    | F8       | export→import identity     | property test (round-trip)          | pin schema; add migration on `version` bump               |

## 8. Tradeoffs — Got / Paid / ADR

| ID  | Tradeoff                                   | Got                                              | Paid                                                | ADR      |
|-----|--------------------------------------------|--------------------------------------------------|-----------------------------------------------------|----------|
| T1  | Vue Flow over hand-rolled SVG              | fast F1–F3, batteries-included editor mechanics  | a dependency owning the view layer + a Model↔VueFlow projection to maintain | ADR-0002 |
| T2  | Flow-as-node + materialised Clouds         | uniform graph for loops/render; info-links can target flows; sim-clean | Cloud lifecycle management; a node that renders as a pipe | ADR-0003 |
| T3  | Enumerate loops with a cap                 | per-loop R/B insight (G2) within the frame budget | capped completeness on pathological graphs ("+N more") | ADR-0001 |
| T4  | IndexedDB(`idb`) behind `ModelRepository`  | size headroom + swappable engine (sync later)    | async wrapper + a small dependency; no sync today   | —        |
| T5  | Snapshot undo over command pattern         | simplicity and correctness                       | memory per snapshot (bounded by ring buffer + small models) | —        |

### Tensions being watched (unresolved by design)

- **Cross-device sync / sharing.** Not built; G3 is met by local persistence + JSON export. **Trigger to revisit:** a real multi-device or collaboration need → add a `PouchdbModelRepository` or API-backed repository behind the existing interface.
- **Auto-layout.** Manual placement only in phase 1. **Trigger to revisit:** users report large models becoming unreadable → add an optional layout pass (e.g. ELK/dagre) over the projection.

## 9. Inconsistencies spotted and fixed

- **Brief vocabulary vs glossary.** The original request said "functions," "arrows," "faucets"; DESIGN uses the resolved CONTEXT.md terms verbatim — **Converter**, **Flow**/**Information Link**, faucet dropped.
- **G3 ambiguity.** "Safe and portable" initially read as possible cloud sync; clarified — G3 is satisfied by **local persistence + JSON export**, not sync (PouchDB deferred, see Tensions).
- **Storage default drift.** Initial recommendation was localStorage; resolved to **IndexedDB via `idb`**, behind a `ModelRepository` interface so the engine choice is no longer hard-to-reverse.

---

## How to keep this honest

- When a new ADR lands → add its components to §6 and re-score affected rows.
- When a spike / measurement returns numbers → update §7 `Target` / `Watched on`.
- WHATs change rarely; HOWs change with each release; matrices are recomputed when either side changes.
- If a section becomes empty after edits, delete it — empty sections lie.
