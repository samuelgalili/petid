import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import catIconGif from "@/assets/cat-icon.gif";

interface Achievement {
  id: number;
  name: string;
  threshold: number;
  icon: string;
  color: string;
  description: string;
}

interface WalletCardProps {
  walletBalance: number;
  achievements: Achievement[];
  onNavigate: () => void;
}

export const WalletCard = ({ walletBalance, achievements, onNavigate }: WalletCardProps) => {
  // Calculate current and next achievement
  const achieved = achievements.filter(a => walletBalance >= a.threshold);
  const next = achievements.find(a => walletBalance < a.threshold);
  const progress = next ? (walletBalance / next.threshold) * 100 : 100;
  const totalAchieved = achieved.length;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          className="mb-6 cursor-pointer px-4 relative"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover="hover"
          whileTap={{ scale: 0.98 }}
          onClick={onNavigate}
          role="button"
          tabIndex={0}
          aria-label="View loyalty card"
        >
          {/* Card Container with Shadow */}
          <motion.div
            className="relative"
            variants={{
              hover: {
                scale: 1.05,
                y: -8,
                transition: { duration: 0.3, ease: "easeOut" }
              }
            }}
          >
            {/* Yellow Loyalty Card - Yellow Brand themed */}
            <motion.div
              className="relative rounded-[22px] shadow-yellow p-6 pt-10 overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, hsl(46, 96%, 49%) 0%, hsl(44, 93%, 48%) 100%)'
              }}
              animate={{
                boxShadow: [
                  '0 4px 12px hsla(45, 100%, 48%, 0.2)',
                  '0 4px 24px hsla(45, 100%, 48%, 0.35)',
                  '0 4px 12px hsla(45, 100%, 48%, 0.2)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Decorative Light Overlay */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/30 rounded-full blur-2xl" />
              </div>

              {/* Direct Layout - Balance Right, Cat Icon Left */}
              <div className="relative flex items-center justify-between px-4">
                {/* Right Side: Balance Display */}
                <motion.div
                  className="text-left"
                  key={walletBalance}
                  initial={{ scale: 1.1, opacity: 0, x: -20 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <div className="text-4xl font-black text-foreground leading-none mb-2 drop-shadow-sm">
                    ₪{walletBalance.toFixed(2)}
                  </div>
                  <div className="text-sm font-bold text-foreground/90 font-jakarta drop-shadow-sm">
                    יתרת חיסכון
                  </div>
                </motion.div>

                {/* Left Side: Cat Icon */}
                <motion.div
                  className="w-20 h-20"
                  animate={{
                    y: [0, -4, 0],
                    rotate: [0, 3, 0]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <img src={catIconGif} alt="Cat" className="w-full h-full object-contain drop-shadow-xl" />
                </motion.div>
              </div>

              {/* Hover-Only Achievement Details */}
              <motion.div
                className="mt-4"
                initial={{ opacity: 0, height: 0, y: -10 }}
                variants={{
                  hover: {
                    opacity: 1,
                    height: "auto",
                    y: 0,
                    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
                  }
                }}
              >
                <div className="bg-card/95 backdrop-blur-md rounded-[22px] p-5 shadow-elevated border border-border">
                  {/* Header */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md">
                      <span className="text-lg">🏆</span>
                    </div>
                    <h3 className="text-base font-black text-foreground font-jakarta">
                      ההישגים שלך
                    </h3>
                  </div>

                  {/* Achievement Progress Bar */}
                  {next && (
                    <div className="mb-4 bg-muted rounded-2xl p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-foreground font-jakarta">
                          עד הישג הבא
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-black text-primary">
                            ₪{(next.threshold - walletBalance).toFixed(0)}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground">נותרו</span>
                        </div>
                      </div>
                      <div className="w-full bg-border rounded-full h-3 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full shadow-lg relative overflow-hidden"
                          style={{
                            background: 'linear-gradient(135deg, hsl(46, 96%, 49%) 0%, hsl(44, 93%, 48%) 100%)'
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                        >
                          {/* Shimmer effect */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          />
                        </motion.div>
                      </div>
                      <div className="text-center mt-1">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {progress.toFixed(0)}% הושלם
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Achievement Badges Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {achievements.slice(0, 4).map((achievement, index) => {
                      const isAchieved = walletBalance >= achievement.threshold;
                      return (
                        <motion.div
                          key={achievement.name}
                          className={`relative overflow-hidden rounded-2xl p-3 transition-all ${
                            isAchieved
                              ? 'bg-gradient-to-br ' + achievement.color + ' shadow-lg'
                              : 'bg-muted'
                          }`}
                          initial={{ opacity: 0, scale: 0.8, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: 0.1 + index * 0.05 }}
                          whileHover={{ scale: 1.05, y: -2 }}
                        >
                          {/* Shine effect for achieved badges */}
                          {isAchieved && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                              animate={{ x: ['-100%', '200%'] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: index * 0.3 }}
                            />
                          )}

                          <div className="relative flex items-center gap-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isAchieved ? 'bg-white/30' : 'bg-card'
                            } shadow-sm ${isAchieved ? '' : 'grayscale opacity-50'}`}>
                              <span className="text-xl">{achievement.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[10px] font-extrabold leading-tight mb-0.5 ${
                                isAchieved ? 'text-white' : 'text-muted-foreground'
                              } font-jakarta`}>
                                {achievement.name}
                              </p>
                              <p className={`text-[9px] font-bold ${
                                isAchieved ? 'text-white/90' : 'text-muted-foreground'
                              }`}>
                                ₪{achievement.threshold}
                              </p>
                            </div>
                            {isAchieved && (
                              <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 200, delay: 0.2 + index * 0.05 }}
                                className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md"
                              >
                                <span className="text-success text-xs font-bold">✓</span>
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Total Achievements Summary */}
                  <div className="bg-primary/15 rounded-2xl p-3 text-center border border-primary/20">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-black text-primary">
                        {totalAchieved}
                      </span>
                      <span className="text-muted-foreground text-sm font-bold">/</span>
                      <span className="text-lg font-bold text-muted-foreground">
                        {achievements.length}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-foreground mt-1 font-jakarta">
                      הישגים שהשגת
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-secondary text-secondary-foreground border-border">
        <p className="font-bold text-sm">כרטיס מועדון PetiID</p>
        <p className="text-xs opacity-90">לחץ לצפייה בהיסטוריית הזמנות וחיסכון</p>
      </TooltipContent>
    </Tooltip>
  );
};
