import { motion } from "framer-motion";

export function SplashScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-orange-100 via-red-50 to-orange-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-center">
        <motion.svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* TOTO Chef - Cute Cartoonish Style */}
          <g transform="translate(100 85)">
            {/* Chef Hat */}
            <motion.path
              d="M-45,-30 C-45,-60 45,-60 45,-30 Q45,-20 35,-15 L-35,-15 Q-45,-20 -45,-30 Z"
              fill="white"
              stroke="#E2E2E2"
              strokeWidth="2"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            />

            {/* Face - More round and cartoonish */}
            <motion.circle
              cx="0"
              cy="15"
              r="40"
              fill="#FFE0BD"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
            />

            {/* Eyes - Simple dots */}
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <circle cx="-15" cy="5" r="4" fill="#4A3826" />
              <circle cx="15" cy="5" r="4" fill="#4A3826" />
            </motion.g>

            {/* Big Happy Smile */}
            <motion.path
              d="M-25,30 Q0,40 25,30"
              stroke="#4A3826"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            />

            {/* Cheeks */}
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              transition={{ delay: 0.6 }}
            >
              <circle cx="-25" cy="25" r="8" fill="#FF9999" />
              <circle cx="25" cy="25" r="8" fill="#FF9999" />
            </motion.g>

            {/* Pizza */}
            <motion.g
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {/* Pizza Base */}
              <circle cx="60" cy="30" r="25" fill="#FFD700" />
              <circle cx="60" cy="30" r="22" fill="#FF6B6B" />

              {/* Toppings */}
              <circle cx="50" cy="25" r="3" fill="#8B4513" />
              <circle cx="70" cy="35" r="3" fill="#8B4513" />
              <circle cx="60" cy="20" r="3" fill="#8B4513" />
              <circle cx="55" cy="40" r="3" fill="#8B4513" />

              {/* Hand holding pizza */}
              <path
                d="M35,30 C40,30 45,35 50,35"
                stroke="#FFE0BD"
                strokeWidth="8"
                strokeLinecap="round"
              />
            </motion.g>
          </g>
        </motion.svg>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-600 text-transparent bg-clip-text mb-2">
            TOTO
          </h1>
          <p className="text-muted-foreground">Chargement de toto</p>
        </motion.div>
      </div>
    </motion.div>
  );
}
