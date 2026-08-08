# Jobber field cheat sheet

Short steps for the six calculator modes. Live app: https://jobberlm.vercel.app/

Press white **mode** (top-left) to cycle programs. Yellow keys change with each mode.

---

## 1. RIGHT TRIANGLE

1. Enter **rise** → press **Rise**
2. Enter **run** → press **Run** (auto-solves)
3. Press **SLP** / **pitch** / **DEG** / **Area** to show each result
4. **ClrTR** clears; **ReTR** restores last triangle
5. Packed angle: `45.3015` → **DMSin** → decimal ° + D°M′S″

---

## 2. CIRCLE

1. Enter diameter → **Diam** (or radius → **RAD**)
2. **Circ** → circumference · **Area** → disk (or segment if **DEG** set)
3. **RAD** + **DEG** → **ARC** (arc length) · **SEG** with `0` → segment height
4. **Cord** or **DEG** → **M.O.** (middle ordinate / sagitta)

---

## 3. ROOF

**Regular hip/valley**

1. Enter pitch (per 12) → **pitch**
2. Enter run → **Run**
3. **HIP** → length ≈ common × √2

**Irregular hip/valley**

1. **pitch** (side 1) → **pitch** again with different pitch (side 2)
2. Enter run on side 1 → **Run** (tape: “irreg ready”)
3. **HIP** → HIP/VAL length + run2 + SLP2 on tape
4. **Rise** → shows rise and secondary plan width (run2)
5. Optional: enter `0` → **DEG** toggles jack side (primary ↔ pitch2)
6. Set **Spac**, then **Rk-Up** / **Rk-Dn** for jack lengths (bay jump: DEC `3` → **Rk-Up**)

---

## 4. STAIRS

1. Enter floor-to-floor → **FL-FL**, riser target → **riserH** (rounds **steps**)
2. Enter tread → **trdWth** → **Run** = tread × (steps − 1)
3. **stringr** → hypotenuse (platform: steps=1 → stringer = FL-FL)
4. Optional **nose** → **pitch** / **angle** use effective tread
5. **1stStp** → first riser + tread/riser summary on tape

---

## 5. OBLIQUE TRIANGLE

1. Enter known sides (**a side** / **b side** / **c side**) and/or angles (**A deg** / **B deg** / **C deg**)
2. Solver fills remaining (SSS / SAS / ASA / SSA)
3. SSA ambiguous: tape notes second **B**
4. **Area** / **DMS** for area or angle A as D°M′S″

---

## 6. TECHNICAL

1. Enter number → **SINE** / **COS** / **%** / **1/X** / **X²** / **√**
2. Packed **DD.MMSS** → **DMSin**
3. **π** · **CuYd** (ft³→yd³) · **SqYd** (ft²→yd²)

---

## Units & memory

- Red keys: **FIS** · **DEC** · **INCH** · **MET**
- Five memory cells: tap = recall · right-click = store · **MEM↓** = store active · **clear mem** = all

## Excel

- Web: floating **Export Excel**
- Add-in: sideload `excel-addin/manifest.prod.xml` → **Insert value** or **Insert table**
