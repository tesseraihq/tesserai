// The whole look comes from one seed, computed when the page loads.
(function () {
  const seed = { h: 200, s: 85, l: 42 };
  const theme = {
    primary: `hsl(${seed.h} ${seed.s}% ${seed.l}%)`,
    bg: `hsl(${seed.h} 20% 98%)`,
    text: `hsl(${seed.h} 30% 12%)`,
    line: `hsl(${seed.h} 15% 88%)`,
    danger: `hsl(${(seed.h + 160) % 360} 70% 45%)`,
  };
  for (const [name, value] of Object.entries(theme)) document.documentElement.style.setProperty(`--${name}`, value);
})();
