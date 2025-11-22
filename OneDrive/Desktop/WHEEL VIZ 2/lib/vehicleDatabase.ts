/**
 * Vehicle Database - Stock wheel specifications for common vehicles
 */

export interface VehicleSpec {
  make: string;
  model: string;
  trim: string;
  year?: string; // Optional year range
  stockSpecs: {
    rimDiameter: number;
    rimWidth: number;
    offset: number;
    boltPattern?: string;
    suspensionType: 'stock';
  };
}

export const VEHICLE_DATABASE: VehicleSpec[] = [
  // ACURA
  {
    make: 'Acura',
    model: 'Integra',
    trim: 'A-Spec',
    year: '2023-2024',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 50, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Acura',
    model: 'TLX',
    trim: 'Base',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 8, offset: 55, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Acura',
    model: 'TLX',
    trim: 'A-Spec',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 55, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Acura',
    model: 'TLX',
    trim: 'Type S',
    year: '2021-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 9.5, offset: 50, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'Acura',
    model: 'NSX',
    trim: 'Base',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 9, offset: 55, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'Acura',
    model: 'MDX',
    trim: 'Base',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 50, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'Acura',
    model: 'RDX',
    trim: 'A-Spec',
    year: '2019-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 8, offset: 50, boltPattern: '5x114.3', suspensionType: 'stock' },
  },

  // ALFA ROMEO
  {
    make: 'Alfa Romeo',
    model: 'Giulia',
    trim: 'Ti',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 35, boltPattern: '5x110', suspensionType: 'stock' },
  },
  {
    make: 'Alfa Romeo',
    model: 'Giulia',
    trim: 'Quadrifoglio',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 9, offset: 32, boltPattern: '5x110', suspensionType: 'stock' },
  },
  {
    make: 'Alfa Romeo',
    model: 'Stelvio',
    trim: 'Ti Sport',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 40, boltPattern: '5x110', suspensionType: 'stock' },
  },

  // AUDI
  {
    make: 'Audi',
    model: 'A3',
    trim: 'Premium',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7.5, offset: 51, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Audi',
    model: 'A4',
    trim: 'Premium',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 45, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Audi',
    model: 'A4',
    trim: 'Prestige',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 43, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Audi',
    model: 'A5',
    trim: 'Premium Plus',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 43, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Audi',
    model: 'A6',
    trim: 'Premium',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 40, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Audi',
    model: 'S3',
    trim: 'Premium Plus',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 48, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Audi',
    model: 'S4',
    trim: 'Premium Plus',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 45, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Audi',
    model: 'S5',
    trim: 'Sportback',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 43, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Audi',
    model: 'RS3',
    trim: 'Base',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 48, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Audi',
    model: 'RS5',
    trim: 'Sportback',
    year: '2020-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9, offset: 33, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Audi',
    model: 'TT',
    trim: 'Quattro',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 45, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Audi',
    model: 'TT RS',
    trim: 'Base',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 9, offset: 52, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Audi',
    model: 'R8',
    trim: 'V10',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 42, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Audi',
    model: 'Q3',
    trim: 'Premium',
    year: '2019-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 7.5, offset: 43, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Audi',
    model: 'Q5',
    trim: 'Premium',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 39, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Audi',
    model: 'Q7',
    trim: 'Premium',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 33, boltPattern: '5x130', suspensionType: 'stock' },
  },
  {
    make: 'Audi',
    model: 'SQ5',
    trim: 'Premium Plus',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9, offset: 37, boltPattern: '5x112', suspensionType: 'stock' },
  },

  // SUBARU
  {
    make: 'Subaru',
    model: 'Impreza',
    trim: 'Base',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 16, rimWidth: 6.5, offset: 48, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Subaru',
    model: 'Impreza',
    trim: 'Sport',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 7, offset: 55, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Subaru',
    model: 'WRX',
    trim: 'Base',
    year: '2015-2021',
    stockSpecs: { rimDiameter: 17, rimWidth: 8, offset: 55, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Subaru',
    model: 'WRX',
    trim: 'Premium',
    year: '2015-2021',
    stockSpecs: { rimDiameter: 18, rimWidth: 8.5, offset: 55, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Subaru',
    model: 'WRX',
    trim: 'STI',
    year: '2015-2021',
    stockSpecs: { rimDiameter: 18, rimWidth: 8.5, offset: 55, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Subaru',
    model: 'WRX',
    trim: 'Base (VB)',
    year: '2022-2024',
    stockSpecs: { rimDiameter: 17, rimWidth: 8, offset: 55, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Subaru',
    model: 'BRZ',
    trim: 'Base',
    year: '2013-2020',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: 48, boltPattern: '5x100', suspensionType: 'stock' },
  },
  {
    make: 'Subaru',
    model: 'BRZ',
    trim: 'Premium',
    year: '2017-2020',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: 48, boltPattern: '5x100', suspensionType: 'stock' },
  },
  {
    make: 'Subaru',
    model: 'BRZ',
    trim: 'Base (ZD8)',
    year: '2022-2024',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: 48, boltPattern: '5x100', suspensionType: 'stock' },
  },
  {
    make: 'Subaru',
    model: 'BRZ',
    trim: 'Limited (ZD8)',
    year: '2022-2024',
    stockSpecs: { rimDiameter: 18, rimWidth: 7.5, offset: 48, boltPattern: '5x100', suspensionType: 'stock' },
  },
  {
    make: 'Subaru',
    model: 'Crosstrek',
    trim: 'Base',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: 48, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Subaru',
    model: 'Outback',
    trim: 'Base',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: 48, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Subaru',
    model: 'Forester',
    trim: 'Sport',
    year: '2019-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 7, offset: 55, boltPattern: '5x114.3', suspensionType: 'stock' },
  },

  // GMC
  {
    make: 'GMC',
    model: 'Sierra 1500',
    trim: 'SLE',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 8, offset: 24, boltPattern: '6x139.7', suspensionType: 'stock' },
  },
  {
    make: 'GMC',
    model: 'Sierra 1500',
    trim: 'Denali',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9, offset: 27, boltPattern: '6x139.7', suspensionType: 'stock' },
  },
  {
    make: 'GMC',
    model: 'Canyon',
    trim: 'All Terrain',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 8, offset: 0, boltPattern: '6x120', suspensionType: 'stock' },
  },

  // HONDA
  {
    make: 'Honda',
    model: 'Accord',
    trim: 'Sport',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8, offset: 55, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Honda',
    model: 'Civic',
    trim: 'LX',
    year: '2016-2021',
    stockSpecs: { rimDiameter: 16, rimWidth: 6.5, offset: 55, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Honda',
    model: 'Civic',
    trim: 'Sport',
    year: '2016-2021',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 55, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Honda',
    model: 'Civic',
    trim: 'Si',
    year: '2017-2021',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 55, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Honda',
    model: 'Civic',
    trim: 'Type R',
    year: '2017-2021',
    stockSpecs: { rimDiameter: 20, rimWidth: 8.5, offset: 60, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'Honda',
    model: 'Civic',
    trim: 'Type R (FL5)',
    year: '2023-2024',
    stockSpecs: { rimDiameter: 19, rimWidth: 9, offset: 60, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'Honda',
    model: 'CR-V',
    trim: 'EX',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: 55, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Honda',
    model: 'Pilot',
    trim: 'Touring',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 8, offset: 55, boltPattern: '5x120', suspensionType: 'stock' },
  },

  // TOYOTA
  {
    make: 'Toyota',
    model: '86',
    trim: 'Base',
    year: '2017-2020',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: 48, boltPattern: '5x100', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'GR86',
    trim: 'Base',
    year: '2022-2024',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: 48, boltPattern: '5x100', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'GR86',
    trim: 'Premium',
    year: '2022-2024',
    stockSpecs: { rimDiameter: 18, rimWidth: 7.5, offset: 48, boltPattern: '5x100', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'Supra',
    trim: '2.0',
    year: '2020-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8.5, offset: 41, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'Supra',
    trim: '3.0',
    year: '2020-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 9, offset: 38, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'Corolla',
    trim: 'SE',
    year: '2020-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 7, offset: 45, boltPattern: '5x100', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'Camry',
    trim: 'SE',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'Camry',
    trim: 'XSE',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'Camry',
    trim: 'TRD',
    year: '2020-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'Avalon',
    trim: 'XSE',
    year: '2019-2022',
    stockSpecs: { rimDiameter: 19, rimWidth: 8, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'Tacoma',
    trim: 'SR',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 16, rimWidth: 7, offset: 30, boltPattern: '6x139.7', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'Tacoma',
    trim: 'SR5',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 16, rimWidth: 7, offset: 30, boltPattern: '6x139.7', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'Tacoma',
    trim: 'TRD Sport',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: 4, boltPattern: '6x139.7', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'Tacoma',
    trim: 'TRD Off-Road',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 16, rimWidth: 7, offset: 0, boltPattern: '6x139.7', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'Tacoma',
    trim: 'TRD Pro',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 16, rimWidth: 7, offset: -10, boltPattern: '6x139.7', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'Tundra',
    trim: 'SR5',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 0, boltPattern: '6x139.7', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'Tundra',
    trim: 'TRD Pro',
    year: '2019-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: -25, boltPattern: '6x139.7', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: '4Runner',
    trim: 'SR5',
    year: '2010-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7.5, offset: 15, boltPattern: '6x139.7', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: '4Runner',
    trim: 'TRD Off-Road',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: 4, boltPattern: '6x139.7', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: '4Runner',
    trim: 'TRD Pro',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: -13, boltPattern: '6x139.7', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'Highlander',
    trim: 'XLE',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 7.5, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'RAV4',
    trim: 'XSE',
    year: '2019-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 7.5, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },

  // FORD
  {
    make: 'Ford',
    model: 'Focus',
    trim: 'ST',
    year: '2013-2018',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 55, boltPattern: '5x108', suspensionType: 'stock' },
  },
  {
    make: 'Ford',
    model: 'Focus',
    trim: 'RS',
    year: '2016-2018',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 55, boltPattern: '5x108', suspensionType: 'stock' },
  },
  {
    make: 'Ford',
    model: 'Fiesta',
    trim: 'ST',
    year: '2014-2019',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: 47.5, boltPattern: '4x108', suspensionType: 'stock' },
  },
  {
    make: 'Ford',
    model: 'Mustang',
    trim: 'EcoBoost',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 44, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Ford',
    model: 'Mustang',
    trim: 'GT',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 9, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Ford',
    model: 'Mustang',
    trim: 'GT350',
    year: '2016-2020',
    stockSpecs: { rimDiameter: 19, rimWidth: 11, offset: 44, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Ford',
    model: 'Mustang',
    trim: 'GT500',
    year: '2020-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 11, offset: 44, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Ford',
    model: 'Mustang',
    trim: 'Mach 1',
    year: '2021-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 9.5, offset: 44, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Ford',
    model: 'F-150',
    trim: 'XL',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7.5, offset: 44, boltPattern: '6x135', suspensionType: 'stock' },
  },
  {
    make: 'Ford',
    model: 'F-150',
    trim: 'XLT',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7.5, offset: 44, boltPattern: '6x135', suspensionType: 'stock' },
  },
  {
    make: 'Ford',
    model: 'F-150',
    trim: 'Lariat',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 44, boltPattern: '6x135', suspensionType: 'stock' },
  },
  {
    make: 'Ford',
    model: 'F-150',
    trim: 'Raptor',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 8.5, offset: 34, boltPattern: '6x135', suspensionType: 'stock' },
  },
  {
    make: 'Ford',
    model: 'Ranger',
    trim: 'XLT',
    year: '2019-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7.5, offset: 44, boltPattern: '6x139.7', suspensionType: 'stock' },
  },
  {
    make: 'Ford',
    model: 'Bronco',
    trim: 'Big Bend',
    year: '2021-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7.5, offset: 44, boltPattern: '5x165.1', suspensionType: 'stock' },
  },
  {
    make: 'Ford',
    model: 'Bronco',
    trim: 'Wildtrak',
    year: '2021-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 8.5, offset: 0, boltPattern: '5x165.1', suspensionType: 'stock' },
  },

  // NISSAN
  {
    make: 'Nissan',
    model: '350Z',
    trim: 'Base',
    year: '2003-2009',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 30, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Nissan',
    model: '370Z',
    trim: 'Base',
    year: '2009-2020',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 43, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Nissan',
    model: '370Z',
    trim: 'Sport',
    year: '2009-2020',
    stockSpecs: { rimDiameter: 19, rimWidth: 9, offset: 47, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Nissan',
    model: 'Z',
    trim: 'Performance',
    year: '2023-2024',
    stockSpecs: { rimDiameter: 19, rimWidth: 9.5, offset: 20, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Nissan',
    model: 'GT-R',
    trim: 'Premium',
    year: '2012-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9.5, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Nissan',
    model: 'Altima',
    trim: 'SR',
    year: '2019-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Nissan',
    model: 'Maxima',
    trim: 'SR',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Nissan',
    model: 'Sentra',
    trim: 'SR',
    year: '2020-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 7.5, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Nissan',
    model: 'Frontier',
    trim: 'SV',
    year: '2022-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7.5, offset: 30, boltPattern: '6x139.7', suspensionType: 'stock' },
  },
  {
    make: 'Nissan',
    model: 'Titan',
    trim: 'SV',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 30, boltPattern: '6x139.7', suspensionType: 'stock' },
  },

  // BMW
  {
    make: 'BMW',
    model: '2 Series',
    trim: '230i',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 7.5, offset: 52, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'BMW',
    model: 'M2',
    trim: 'Competition',
    year: '2019-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 9, offset: 38, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'BMW',
    model: '3 Series',
    trim: '320i',
    year: '2013-2018',
    stockSpecs: { rimDiameter: 17, rimWidth: 7.5, offset: 40, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'BMW',
    model: '3 Series',
    trim: '330i (F30)',
    year: '2016-2018',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 34, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'BMW',
    model: '3 Series',
    trim: '330i (G20)',
    year: '2019-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 36, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'BMW',
    model: '3 Series',
    trim: 'M340i',
    year: '2020-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 36, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'BMW',
    model: '4 Series',
    trim: '430i',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 36, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'BMW',
    model: '4 Series',
    trim: 'M440i',
    year: '2021-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 36, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'BMW',
    model: '5 Series',
    trim: '530i',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 30, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'BMW',
    model: '5 Series',
    trim: 'M550i',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 25, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'BMW',
    model: 'M2',
    trim: 'Base',
    year: '2016-2020',
    stockSpecs: { rimDiameter: 19, rimWidth: 9, offset: 35, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'BMW',
    model: 'M3',
    trim: 'Base (F80)',
    year: '2015-2020',
    stockSpecs: { rimDiameter: 19, rimWidth: 9, offset: 29, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'BMW',
    model: 'M3',
    trim: 'Competition',
    year: '2021-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 9.5, offset: 29, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'BMW',
    model: 'M4',
    trim: 'Competition',
    year: '2021-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 9.5, offset: 29, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'BMW',
    model: 'M5',
    trim: 'Competition',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9.5, offset: 27, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'BMW',
    model: 'X3',
    trim: 'xDrive30i',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 43, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'BMW',
    model: 'X5',
    trim: 'xDrive40i',
    year: '2019-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 9, offset: 48, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'BMW',
    model: 'Z4',
    trim: 'sDrive30i',
    year: '2019-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 36, boltPattern: '5x112', suspensionType: 'stock' },
  },

  // VOLKSWAGEN
  {
    make: 'Volkswagen',
    model: 'Jetta',
    trim: 'GLI',
    year: '2019-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 50, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Volkswagen',
    model: 'Golf',
    trim: 'GTI (Mk7)',
    year: '2015-2021',
    stockSpecs: { rimDiameter: 18, rimWidth: 7.5, offset: 51, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Volkswagen',
    model: 'Golf',
    trim: 'GTI (Mk8)',
    year: '2022-2024',
    stockSpecs: { rimDiameter: 18, rimWidth: 7.5, offset: 49, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Volkswagen',
    model: 'Golf',
    trim: 'R (Mk7)',
    year: '2015-2021',
    stockSpecs: { rimDiameter: 19, rimWidth: 8, offset: 50, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Volkswagen',
    model: 'Golf',
    trim: 'R (Mk8)',
    year: '2022-2024',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 49, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Volkswagen',
    model: 'Passat',
    trim: 'SEL',
    year: '2015-2022',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 41, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Volkswagen',
    model: 'Arteon',
    trim: 'SE',
    year: '2019-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8, offset: 41, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Volkswagen',
    model: 'Tiguan',
    trim: 'SEL',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 7.5, offset: 45, boltPattern: '5x112', suspensionType: 'stock' },
  },

  // CADILLAC
  {
    make: 'Cadillac',
    model: 'ATS',
    trim: 'Luxury',
    year: '2013-2019',
    stockSpecs: { rimDiameter: 17, rimWidth: 8, offset: 40, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'Cadillac',
    model: 'CTS',
    trim: 'V-Sport',
    year: '2014-2019',
    stockSpecs: { rimDiameter: 18, rimWidth: 9, offset: 35, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'Cadillac',
    model: 'CT4-V',
    trim: 'Blackwing',
    year: '2022-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 9, offset: 40, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'Cadillac',
    model: 'CT5-V',
    trim: 'Blackwing',
    year: '2022-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 10, offset: 35, boltPattern: '5x120', suspensionType: 'stock' },
  },

  // DODGE
  {
    make: 'Dodge',
    model: 'Challenger',
    trim: 'SXT',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 7.5, offset: 24, boltPattern: '5x115', suspensionType: 'stock' },
  },
  {
    make: 'Dodge',
    model: 'Challenger',
    trim: 'R/T',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9, offset: 24, boltPattern: '5x115', suspensionType: 'stock' },
  },
  {
    make: 'Dodge',
    model: 'Challenger',
    trim: 'Hellcat',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9.5, offset: 24, boltPattern: '5x115', suspensionType: 'stock' },
  },
  {
    make: 'Dodge',
    model: 'Charger',
    trim: 'R/T',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 8, offset: 24, boltPattern: '5x115', suspensionType: 'stock' },
  },
  {
    make: 'Dodge',
    model: 'Charger',
    trim: 'Scat Pack',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9, offset: 24, boltPattern: '5x115', suspensionType: 'stock' },
  },
  {
    make: 'Dodge',
    model: 'Charger',
    trim: 'Hellcat',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9.5, offset: 24, boltPattern: '5x115', suspensionType: 'stock' },
  },
  {
    make: 'Dodge',
    model: 'Durango',
    trim: 'R/T',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 8, offset: 45, boltPattern: '5x127', suspensionType: 'stock' },
  },

  // CHEVROLET
  {
    make: 'Chevrolet',
    model: 'Camaro',
    trim: 'SS',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9.5, offset: 35, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'Chevrolet',
    model: 'Camaro',
    trim: 'ZL1',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 10, offset: 35, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'Chevrolet',
    model: 'Corvette',
    trim: 'Stingray',
    year: '2014-2019',
    stockSpecs: { rimDiameter: 19, rimWidth: 10, offset: 79, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'Chevrolet',
    model: 'Corvette',
    trim: 'C8 Stingray',
    year: '2020-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 65, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'Chevrolet',
    model: 'Silverado 1500',
    trim: 'LT',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8.5, offset: 24, boltPattern: '6x139.7', suspensionType: 'stock' },
  },
  {
    make: 'Chevrolet',
    model: 'Silverado 1500',
    trim: 'Trail Boss',
    year: '2019-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 9, offset: 0, boltPattern: '6x139.7', suspensionType: 'stock' },
  },

  // HYUNDAI
  {
    make: 'Hyundai',
    model: 'Elantra',
    trim: 'Sport',
    year: '2017-2020',
    stockSpecs: { rimDiameter: 18, rimWidth: 7.5, offset: 52, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Hyundai',
    model: 'Veloster',
    trim: 'N',
    year: '2019-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8, offset: 55, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Hyundai',
    model: 'Genesis',
    trim: 'G70 Sport',
    year: '2019-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },

  // INFINITI
  {
    make: 'Infiniti',
    model: 'Q50',
    trim: 'Sport',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 50, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Infiniti',
    model: 'Q60',
    trim: 'Red Sport',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 9, offset: 50, boltPattern: '5x114.3', suspensionType: 'stock' },
  },

  // JEEP
  {
    make: 'Jeep',
    model: 'Wrangler',
    trim: 'Rubicon',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7.5, offset: 44, boltPattern: '5x127', suspensionType: 'stock' },
  },
  {
    make: 'Jeep',
    model: 'Grand Cherokee',
    trim: 'Limited',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 50, boltPattern: '5x127', suspensionType: 'stock' },
  },
  {
    make: 'Jeep',
    model: 'Gladiator',
    trim: 'Rubicon',
    year: '2020-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7.5, offset: 44, boltPattern: '5x127', suspensionType: 'stock' },
  },

  // KIA
  {
    make: 'Kia',
    model: 'Stinger',
    trim: 'GT',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 52, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Kia',
    model: 'Forte',
    trim: 'GT',
    year: '2020-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 7.5, offset: 50, boltPattern: '5x114.3', suspensionType: 'stock' },
  },

  // LEXUS
  {
    make: 'Lexus',
    model: 'IS 300',
    trim: 'Base',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 8, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Lexus',
    model: 'IS 350',
    trim: 'Base',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 8, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Lexus',
    model: 'IS 350',
    trim: 'F Sport',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Lexus',
    model: 'RC 350',
    trim: 'F Sport',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 38, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Lexus',
    model: 'RC F',
    trim: 'Base',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 9.5, offset: 38, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Lexus',
    model: 'GS 350',
    trim: 'F Sport',
    year: '2013-2020',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Lexus',
    model: 'LC 500',
    trim: 'Base',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9.5, offset: 40, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'Lexus',
    model: 'NX',
    trim: 'F Sport',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 7.5, offset: 35, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Lexus',
    model: 'RX 350',
    trim: 'F Sport',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 8, offset: 30, boltPattern: '5x114.3', suspensionType: 'stock' },
  },

  // MAZDA
  {
    make: 'Mazda',
    model: 'Mazda3',
    trim: 'Base',
    year: '2019-2023',
    stockSpecs: { rimDiameter: 16, rimWidth: 6.5, offset: 52.5, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Mazda',
    model: 'Mazda3',
    trim: 'Turbo',
    year: '2021-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 7, offset: 50, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Mazda',
    model: 'Mazda6',
    trim: 'Grand Touring',
    year: '2014-2021',
    stockSpecs: { rimDiameter: 19, rimWidth: 7.5, offset: 50, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Mazda',
    model: 'MX-5 Miata',
    trim: 'Sport',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 16, rimWidth: 6.5, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Mazda',
    model: 'MX-5 Miata',
    trim: 'Club',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Mazda',
    model: 'MX-5 Miata',
    trim: 'RF Grand Touring',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Mazda',
    model: 'RX-8',
    trim: 'Sport',
    year: '2004-2011',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 50, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Mazda',
    model: 'CX-5',
    trim: 'Sport',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: 50, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Mazda',
    model: 'CX-5',
    trim: 'Touring',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: 50, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Mazda',
    model: 'CX-9',
    trim: 'Touring',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 7.5, offset: 50, boltPattern: '5x114.3', suspensionType: 'stock' },
  },

  // MERCEDES-BENZ
  {
    make: 'Mercedes-Benz',
    model: 'A-Class',
    trim: 'A220',
    year: '2019-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: 51, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Mercedes-Benz',
    model: 'CLA',
    trim: 'CLA 250',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 7.5, offset: 52, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Mercedes-Benz',
    model: 'CLA',
    trim: 'AMG CLA 45',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 48, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Mercedes-Benz',
    model: 'C-Class',
    trim: 'C300',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7.5, offset: 47, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Mercedes-Benz',
    model: 'C-Class',
    trim: 'AMG C43',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8.5, offset: 43, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Mercedes-Benz',
    model: 'C-Class',
    trim: 'AMG C63',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 9, offset: 37, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Mercedes-Benz',
    model: 'E-Class',
    trim: 'E300',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 43, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Mercedes-Benz',
    model: 'E-Class',
    trim: 'E350',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 43, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Mercedes-Benz',
    model: 'E-Class',
    trim: 'AMG E63',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 9.5, offset: 37, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Mercedes-Benz',
    model: 'S-Class',
    trim: 'S500',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 43, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Mercedes-Benz',
    model: 'GLC',
    trim: 'GLC 300',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 56, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Mercedes-Benz',
    model: 'GLE',
    trim: 'GLE 350',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8, offset: 60, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Mercedes-Benz',
    model: 'AMG GT',
    trim: 'Base',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 10, offset: 28, boltPattern: '5x112', suspensionType: 'stock' },
  },

  // LINCOLN
  {
    make: 'Lincoln',
    model: 'Navigator',
    trim: 'Reserve',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 8.5, offset: 44, boltPattern: '6x135', suspensionType: 'stock' },
  },
  {
    make: 'Lincoln',
    model: 'Aviator',
    trim: 'Grand Touring',
    year: '2020-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 8.5, offset: 50, boltPattern: '5x114.3', suspensionType: 'stock' },
  },

  // LOTUS
  {
    make: 'Lotus',
    model: 'Evora',
    trim: 'GT',
    year: '2017-2021',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 45, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Lotus',
    model: 'Emira',
    trim: 'First Edition',
    year: '2023-2024',
    stockSpecs: { rimDiameter: 20, rimWidth: 8.5, offset: 42, boltPattern: '5x114.3', suspensionType: 'stock' },
  },

  // MASERATI
  {
    make: 'Maserati',
    model: 'Ghibli',
    trim: 'S',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 35, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Maserati',
    model: 'Quattroporte',
    trim: 'S',
    year: '2013-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9, offset: 35, boltPattern: '5x114.3', suspensionType: 'stock' },
  },

  // McLAREN
  {
    make: 'McLaren',
    model: '570S',
    trim: 'Base',
    year: '2016-2021',
    stockSpecs: { rimDiameter: 19, rimWidth: 9, offset: 39, boltPattern: '5x130', suspensionType: 'stock' },
  },
  {
    make: 'McLaren',
    model: '720S',
    trim: 'Base',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 9.5, offset: 42, boltPattern: '5x130', suspensionType: 'stock' },
  },

  // MINI
  {
    make: 'MINI',
    model: 'Cooper',
    trim: 'S',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: 48, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'MINI',
    model: 'Cooper',
    trim: 'John Cooper Works',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 7.5, offset: 52, boltPattern: '5x120', suspensionType: 'stock' },
  },

  // MITSUBISHI
  {
    make: 'Mitsubishi',
    model: 'Lancer',
    trim: 'Evolution X',
    year: '2008-2015',
    stockSpecs: { rimDiameter: 18, rimWidth: 8.5, offset: 38, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Mitsubishi',
    model: 'Eclipse Cross',
    trim: 'SE',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 7, offset: 38, boltPattern: '5x114.3', suspensionType: 'stock' },
  },

  // LAMBORGHINI
  {
    make: 'Lamborghini',
    model: 'Huracan',
    trim: 'LP610-4',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 9, offset: 35, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Lamborghini',
    model: 'Aventador',
    trim: 'LP740-4',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9, offset: 35, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Lamborghini',
    model: 'Urus',
    trim: 'Base',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 21, rimWidth: 10, offset: 31, boltPattern: '5x112', suspensionType: 'stock' },
  },

  // FERRARI
  {
    make: 'Ferrari',
    model: '488',
    trim: 'GTB',
    year: '2016-2020',
    stockSpecs: { rimDiameter: 20, rimWidth: 9.5, offset: 42, boltPattern: '5x108', suspensionType: 'stock' },
  },
  {
    make: 'Ferrari',
    model: 'F8',
    trim: 'Tributo',
    year: '2020-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9, offset: 40, boltPattern: '5x108', suspensionType: 'stock' },
  },

  // PORSCHE
  {
    make: 'Porsche',
    model: '911',
    trim: 'Carrera',
    year: '2012-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 51, boltPattern: '5x130', suspensionType: 'stock' },
  },
  {
    make: 'Porsche',
    model: '911',
    trim: 'Carrera S',
    year: '2012-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9, offset: 51, boltPattern: '5x130', suspensionType: 'stock' },
  },
  {
    make: 'Porsche',
    model: '911',
    trim: 'Turbo',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9.5, offset: 51, boltPattern: '5x130', suspensionType: 'stock' },
  },
  {
    make: 'Porsche',
    model: '911',
    trim: 'GT3',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9, offset: 51, boltPattern: '5x130', suspensionType: 'stock' },
  },
  {
    make: 'Porsche',
    model: 'Boxster',
    trim: 'Base',
    year: '2013-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 57, boltPattern: '5x130', suspensionType: 'stock' },
  },
  {
    make: 'Porsche',
    model: 'Cayman',
    trim: 'Base',
    year: '2014-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8, offset: 57, boltPattern: '5x130', suspensionType: 'stock' },
  },
  {
    make: 'Porsche',
    model: 'Cayman',
    trim: 'GT4',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9, offset: 57, boltPattern: '5x130', suspensionType: 'stock' },
  },
  {
    make: 'Porsche',
    model: 'Cayenne',
    trim: 'Base',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 21, boltPattern: '5x130', suspensionType: 'stock' },
  },
  {
    make: 'Porsche',
    model: 'Macan',
    trim: 'S',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 21, boltPattern: '5x112', suspensionType: 'stock' },
  },
  {
    make: 'Porsche',
    model: 'Taycan',
    trim: '4S',
    year: '2020-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9, offset: 51, boltPattern: '5x130', suspensionType: 'stock' },
  },

  // RAM
  {
    make: 'Ram',
    model: '1500',
    trim: 'Big Horn',
    year: '2013-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 20, boltPattern: '5x139.7', suspensionType: 'stock' },
  },
  {
    make: 'Ram',
    model: '1500',
    trim: 'Rebel',
    year: '2015-2023',
    stockSpecs: { rimDiameter: 17, rimWidth: 8, offset: 0, boltPattern: '5x139.7', suspensionType: 'stock' },
  },

  // SCION
  {
    make: 'Scion',
    model: 'FR-S',
    trim: 'Base',
    year: '2013-2016',
    stockSpecs: { rimDiameter: 17, rimWidth: 7, offset: 48, boltPattern: '5x100', suspensionType: 'stock' },
  },

  // SCION / TOYOTA
  {
    make: 'Toyota',
    model: 'GR Corolla',
    trim: 'Core',
    year: '2023-2024',
    stockSpecs: { rimDiameter: 18, rimWidth: 7.5, offset: 48, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Toyota',
    model: 'GR Corolla',
    trim: 'Circuit Edition',
    year: '2023-2024',
    stockSpecs: { rimDiameter: 18, rimWidth: 8, offset: 50, boltPattern: '5x114.3', suspensionType: 'stock' },
  },

  // TESLA
  {
    make: 'Tesla',
    model: 'Model 3',
    trim: 'Standard Range',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 18, rimWidth: 8.5, offset: 40, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Tesla',
    model: 'Model 3',
    trim: 'Long Range',
    year: '2017-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 40, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Tesla',
    model: 'Model 3',
    trim: 'Performance',
    year: '2018-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9, offset: 40, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Tesla',
    model: 'Model S',
    trim: 'Long Range',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 40, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'Tesla',
    model: 'Model S',
    trim: 'Plaid',
    year: '2021-2023',
    stockSpecs: { rimDiameter: 21, rimWidth: 9.5, offset: 40, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'Tesla',
    model: 'Model X',
    trim: 'Long Range',
    year: '2016-2023',
    stockSpecs: { rimDiameter: 20, rimWidth: 9, offset: 40, boltPattern: '5x120', suspensionType: 'stock' },
  },
  {
    make: 'Tesla',
    model: 'Model Y',
    trim: 'Long Range',
    year: '2020-2023',
    stockSpecs: { rimDiameter: 19, rimWidth: 8.5, offset: 40, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
  {
    make: 'Tesla',
    model: 'Model Y',
    trim: 'Performance',
    year: '2020-2023',
    stockSpecs: { rimDiameter: 21, rimWidth: 9.5, offset: 40, boltPattern: '5x114.3', suspensionType: 'stock' },
  },
];

/**
 * Get unique makes from database
 */
export function getAvailableMakes(): string[] {
  const makes = [...new Set(VEHICLE_DATABASE.map((v) => v.make))];
  return makes.sort();
}

/**
 * Get models for a specific make
 */
export function getModelsForMake(make: string): string[] {
  const models = [
    ...new Set(
      VEHICLE_DATABASE.filter((v) => v.make === make).map((v) => v.model)
    ),
  ];
  return models.sort();
}

/**
 * Get trims for a specific make and model
 */
export function getTrimsForModel(make: string, model: string): VehicleSpec[] {
  return VEHICLE_DATABASE.filter(
    (v) => v.make === make && v.model === model
  ).sort((a, b) => a.trim.localeCompare(b.trim));
}

/**
 * Get vehicle specs by make, model, and trim
 */
export function getVehicleSpecs(
  make: string,
  model: string,
  trim: string
): VehicleSpec | null {
  return (
    VEHICLE_DATABASE.find(
      (v) => v.make === make && v.model === model && v.trim === trim
    ) || null
  );
}

