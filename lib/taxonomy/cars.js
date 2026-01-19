// lib/taxonomy/cars.js
import { matchKeyFromValue, detectKeyFromText } from './helpers';

export const CAR_MAKES = [
  { key: 'toyota', label: 'تويوتا', aliases: ['toyota', 'تويوتا', 'تايوتا'] },
  { key: 'hyundai', label: 'هيونداي', aliases: ['hyundai', 'هيونداي', 'هيونداى'] },
  { key: 'nissan', label: 'نيسان', aliases: ['nissan', 'نيسان'] },
  { key: 'kia', label: 'كيا', aliases: ['kia', 'كيا'] },
  { key: 'honda', label: 'هوندا', aliases: ['honda', 'هوندا'] },
  { key: 'mazda', label: 'مازدا', aliases: ['mazda', 'مازدا'] },
  { key: 'mitsubishi', label: 'ميتسوبيشي', aliases: ['mitsubishi', 'ميتسوبيشي', 'متسوبيشي'] },
  { key: 'ford', label: 'فورد', aliases: ['ford', 'فورد'] },
  { key: 'chevrolet', label: 'شيفروليه', aliases: ['chevrolet', 'chevy', 'شيفروليه', 'شفروليه'] },
  { key: 'gmc', label: 'جي ام سي', aliases: ['gmc', 'جي ام سي', 'جمس'] },
  { key: 'isuzu', label: 'ايسوزو', aliases: ['isuzu', 'ايسوزو', 'إيسوزو'] },
  { key: 'suzuki', label: 'سوزوكي', aliases: ['suzuki', 'سوزوكي'] },
  { key: 'bmw', label: 'بي ام دبليو', aliases: ['bmw', 'بي ام دبليو'] },
  { key: 'mercedes', label: 'مرسيدس', aliases: ['mercedes', 'benz', 'مرسيدس', 'بنز'] },
  { key: 'lexus', label: 'لكزس', aliases: ['lexus', 'لكزس'] },
  { key: 'jeep', label: 'جيب', aliases: ['jeep', 'جيب'] },
  { key: 'mg', label: 'MG', aliases: ['mg', 'ام جي', 'إم جي'] },
  { key: 'geely', label: 'جيلي', aliases: ['geely', 'جيلي'] },
  { key: 'byd', label: 'BYD', aliases: ['byd', 'بي واي دي'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
];

export function normalizeCarMake(v) {
  return matchKeyFromValue(v, CAR_MAKES) || '';
}

export function detectCarMakeFromText(text) {
  return detectKeyFromText(text, CAR_MAKES) || '';
}

export function carMakeLabel(key) {
  const it = CAR_MAKES.find((x) => x.key === key);
  return it ? it.label : '';
}
