import MaterialIcon from '../components/MaterialIcon';

export default function Help() {
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 inline-flex items-center gap-2">
          <MaterialIcon name="help" className="text-[22px] text-blue-600 dark:text-blue-400" />
          Help / Manual
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Quick guide for navigation, metric colors, and settings.
        </p>
      </div>

      <section className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl shadow-sm p-5 border border-blue-100 dark:border-blue-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 inline-flex items-center gap-2">
          <MaterialIcon name="explore" className="text-[20px] text-blue-600 dark:text-blue-400" />
          Navigation
        </h2>
        <div className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-200">
          <div className="flex items-start gap-3 rounded-lg bg-white/70 dark:bg-gray-800/60 border border-blue-100 dark:border-blue-800 px-3 py-2">
            <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center mt-0.5">
              <span className="text-white font-bold text-[11px]">M</span>
            </div>
            <div className="leading-6">
              <div className="font-semibold text-gray-800 dark:text-gray-100">Site:</div>
              <div>Back in editor/forms, otherwise Home dashboard.</div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/70 dark:bg-gray-800/60 border border-blue-100 dark:border-blue-800 px-3 py-2">
            <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center mt-0.5">
              <MaterialIcon name="check_circle" className="text-[18px] text-gray-400" />
            </div>
            <div className="leading-6">
              <div className="font-semibold text-gray-800 dark:text-gray-100">Check-in:</div>
              <div>Gray before first check-in today. After first check-in: plain white (tap to edit).</div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/70 dark:bg-gray-800/60 border border-blue-100 dark:border-blue-800 px-3 py-2">
            <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center mt-0.5">
              <MaterialIcon name="menu" className="text-[16px] text-gray-600" />
            </div>
            <div className="leading-6">
              <div className="font-semibold text-gray-800 dark:text-gray-100">Options:</div>
              <div>- Entry Manager</div>
              <div>- Food Manager</div>
              <div>- Cycling</div>
              <div>- Settings</div>
              <div>- Help</div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-white/70 dark:bg-gray-800/60 border border-blue-100 dark:border-blue-800 px-3 py-2">
            <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center mt-0.5">
              <MaterialIcon name="history" className="text-[16px] text-gray-600" />
            </div>
            <div className="leading-6">
              <div className="font-semibold text-gray-800 dark:text-gray-100">History:</div>
              <div>- Food</div>
              <div>- Check-in</div>
              <div>- Goals</div>
              <div>- Milestones</div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl shadow-sm p-5 border border-emerald-100 dark:border-emerald-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 inline-flex items-center gap-2">
          <MaterialIcon name="monitor_heart" className="text-[20px] text-emerald-600 dark:text-emerald-400" />
          Metric Limits (Today&apos;s Check-in)
        </h2>
        <div className="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-200">
          <div>
            <div className="font-semibold">Weight (kg)</div>
            <div><span className="inline-block w-24 text-left text-green-600 dark:text-green-400 font-semibold">Green</span><span className="mx-2">:</span>{'<='} 78</div>
            <div><span className="inline-block w-24 text-left text-amber-600 dark:text-amber-400 font-semibold">Amber</span><span className="mx-2">:</span>{'>'} 78 and {'<='} 80</div>
            <div><span className="inline-block w-24 text-left text-red-600 dark:text-red-400 font-semibold">Red</span><span className="mx-2">:</span>{'>'} 80</div>
            <div>Arrow up if value increased vs previous check-in, down if decreased, flat if equal.</div>
          </div>
          <div>
            <div className="font-semibold">BMI</div>
            <div><span className="inline-block w-24 text-left text-blue-500 font-semibold">Blue</span><span className="mx-2">:</span>{'<'} 18.5</div>
            <div><span className="inline-block w-24 text-left text-green-600 dark:text-green-400 font-semibold">Green</span><span className="mx-2">:</span>18.5-24.9</div>
            <div><span className="inline-block w-24 text-left text-amber-600 dark:text-amber-400 font-semibold">Amber</span><span className="mx-2">:</span>25.0-29.9</div>
            <div><span className="inline-block w-24 text-left text-red-600 dark:text-red-400 font-semibold">Red</span><span className="mx-2">:</span>{'>='} 30</div>
          </div>
          <div>
            <div className="font-semibold">Steps</div>
            <div><span className="inline-block w-24 text-left text-red-600 dark:text-red-400 font-semibold">Red</span><span className="mx-2">:</span>{'<'} 5000</div>
            <div><span className="inline-block w-24 text-left text-orange-600 dark:text-orange-400 font-semibold">Orange</span><span className="mx-2">:</span>5000-6999</div>
            <div><span className="inline-block w-24 text-left text-amber-600 dark:text-amber-400 font-semibold">Amber</span><span className="mx-2">:</span>7000-8999</div>
            <div><span className="inline-block w-24 text-left text-green-600 dark:text-green-400 font-semibold">Green</span><span className="mx-2">:</span>{'>='} 9000</div>
          </div>
          <div>
            <div className="font-semibold">BP High / Systolic (mmHg)</div>
            <div><span className="inline-block w-24 text-left text-green-600 dark:text-green-400 font-semibold">Green</span><span className="mx-2">:</span>sys {'<'} 120</div>
            <div><span className="inline-block w-24 text-left text-amber-600 dark:text-amber-400 font-semibold">Amber</span><span className="mx-2">:</span>sys {'>'} 120 and sys {'<='} 129</div>
            <div><span className="inline-block w-24 text-left text-orange-600 dark:text-orange-400 font-semibold">Orange</span><span className="mx-2">:</span>sys {'>'} 129 and sys {'<='} 149</div>
            <div><span className="inline-block w-24 text-left text-red-600 dark:text-red-400 font-semibold">Red</span><span className="mx-2">:</span>sys {'>='} 150</div>
          </div>
          <div>
            <div className="font-semibold">BP Low / Diastolic (mmHg)</div>
            <div><span className="inline-block w-24 text-left text-green-600 dark:text-green-400 font-semibold">Green</span><span className="mx-2">:</span>dia {'<'} 85</div>
            <div><span className="inline-block w-24 text-left text-amber-600 dark:text-amber-400 font-semibold">Amber</span><span className="mx-2">:</span>dia {'>='} 85 and dia {'<='} 90</div>
            <div><span className="inline-block w-24 text-left text-orange-600 dark:text-orange-400 font-semibold">Orange</span><span className="mx-2">:</span>dia {'>'} 90 and dia {'<='} 95</div>
            <div><span className="inline-block w-24 text-left text-red-600 dark:text-red-400 font-semibold">Red</span><span className="mx-2">:</span>dia {'>'} 95</div>
          </div>
          <div>
            <div className="font-semibold">Glucose (mmol/L)</div>
            <div><span className="inline-block w-24 text-left text-red-600 dark:text-red-400 font-semibold">Red</span><span className="mx-2">:</span>{'<'} 3.9</div>
            <div><span className="inline-block w-24 text-left text-amber-600 dark:text-amber-400 font-semibold">Amber</span><span className="mx-2">:</span>3.9 to {'<'} 4.4</div>
            <div><span className="inline-block w-24 text-left text-green-600 dark:text-green-400 font-semibold">Green</span><span className="mx-2">:</span>4.4 to 7.2</div>
            <div><span className="inline-block w-24 text-left text-amber-600 dark:text-amber-400 font-semibold">Amber</span><span className="mx-2">:</span>{'>'} 7.2 to 10.0</div>
            <div><span className="inline-block w-24 text-left text-red-600 dark:text-red-400 font-semibold">Red</span><span className="mx-2">:</span>{'>'} 10.0 to 13.9</div>
            <div><span className="inline-block w-24 text-left text-red-700 dark:text-red-300 font-semibold">Critical red</span><span className="mx-2">:</span>{'>'} 13.9</div>
          </div>
          <div>
            <div className="font-semibold">Ketones (mmol/L)</div>
            <div><span className="inline-block w-24 text-left text-red-600 dark:text-red-400 font-semibold">Red</span><span className="mx-2">:</span>{'<'} 0.5</div>
            <div><span className="inline-block w-24 text-left text-amber-600 dark:text-amber-400 font-semibold">Amber</span><span className="mx-2">:</span>{'>='} 0.5 and {'<'} 1</div>
            <div><span className="inline-block w-24 text-left text-green-600 dark:text-green-400 font-semibold">Green</span><span className="mx-2">:</span>{'>='} 1 and {'<='} 5</div>
            <div><span className="inline-block w-24 text-left text-red-700 dark:text-red-300 font-semibold">Critical red</span><span className="mx-2">:</span>{'>'} 5</div>
          </div>
          <div>
            <div className="font-semibold">Heart Rate (bpm)</div>
            <div><span className="inline-block w-24 text-left text-red-600 dark:text-red-400 font-semibold">Red</span><span className="mx-2">:</span>{'<'} 40</div>
            <div><span className="inline-block w-24 text-left text-amber-600 dark:text-amber-400 font-semibold">Amber</span><span className="mx-2">:</span>40-59</div>
            <div><span className="inline-block w-24 text-left text-green-600 dark:text-green-400 font-semibold">Green</span><span className="mx-2">:</span>60-100</div>
            <div><span className="inline-block w-24 text-left text-amber-600 dark:text-amber-400 font-semibold">Amber</span><span className="mx-2">:</span>101-120</div>
            <div><span className="inline-block w-24 text-left text-red-600 dark:text-red-400 font-semibold">Red</span><span className="mx-2">:</span>{'>'} 120</div>
          </div>
        </div>
      </section>

      <section className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl shadow-sm p-5 border border-purple-100 dark:border-purple-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 inline-flex items-center gap-2">
          <MaterialIcon name="settings" className="text-[20px] text-purple-600 dark:text-purple-400" />
          Settings
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-200">
          <li>Set goals (calories/macros/weight/height), race target, and step goal.</li>
          <li>Manage backups with export/import.</li>
          <li>Use release notes and feature requests to track updates and ideas.</li>
        </ul>
      </section>
    </div>
  );
}
