// Car brands for the "Car logos" quiz. The logos themselves are drawn by the
// UI (ui/games/carLogos.ts); brand names are written the same in every language.
export const CAR_BRANDS = [
  'audi', 'bentley', 'bugatti', 'cadillac', 'chevrolet', 'dacia', 'ferrari', 'honda', 'hyundai', 'infiniti',
  'lada', 'lamborghini', 'maserati', 'mazda', 'mitsubishi', 'opel', 'renault', 'rolls-royce', 'seat', 'smart',
  'subaru', 'suzuki', 'tesla', 'toyota', 'volkswagen', 'mercedes', 'lexus', 'citroen', 'skoda', 'cupra', 'polestar',
  // Chinese brands, many of them common on the roads by now
  'chery', 'geely', 'gwm', 'tank', 'jetour', 'livan', 'dongfeng', 'nio', 'xpeng', 'li-auto', 'zeekr', 'wuling',
  'deepal', 'avatr', 'leapmotor',
] as const;

export type CarBrand = (typeof CAR_BRANDS)[number];

export const CAR_BRAND_NAME: Record<CarBrand, string> = {
  audi: 'Audi', bentley: 'Bentley', bugatti: 'Bugatti', cadillac: 'Cadillac', chevrolet: 'Chevrolet', dacia: 'Dacia',
  ferrari: 'Ferrari', honda: 'Honda', hyundai: 'Hyundai', infiniti: 'Infiniti', lada: 'Lada', lamborghini: 'Lamborghini',
  maserati: 'Maserati', mazda: 'Mazda', mitsubishi: 'Mitsubishi', opel: 'Opel', renault: 'Renault', 'rolls-royce': 'Rolls-Royce',
  seat: 'SEAT', smart: 'smart', subaru: 'Subaru', suzuki: 'Suzuki', tesla: 'Tesla', toyota: 'Toyota', volkswagen: 'Volkswagen',
  mercedes: 'Mercedes-Benz', lexus: 'Lexus', citroen: 'Citroën', skoda: 'Škoda', cupra: 'Cupra', polestar: 'Polestar',
  chery: 'Chery', geely: 'Geely', gwm: 'Great Wall', tank: 'Tank', jetour: 'Jetour', livan: 'Livan', dongfeng: 'Dongfeng',
  nio: 'NIO', xpeng: 'XPeng', 'li-auto': 'Li Auto', zeekr: 'Zeekr', wuling: 'Wuling', deepal: 'Deepal', avatr: 'Avatr',
  leapmotor: 'Leapmotor',
};
