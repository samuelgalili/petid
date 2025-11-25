import { motion } from "framer-motion";
import petidLogo from "@/assets/petid-logo.png";
import dogIcon from "@/assets/dog-icon.gif";
import catIcon from "@/assets/cat-icon.gif";
interface PetidLogoProps {
  showAnimals?: boolean;
  className?: string;
}
export const PetidLogo = ({
  showAnimals = true,
  className = ""
}: PetidLogoProps) => {
  return <div className={className}>
      {/* Logo */}
      <div className="flex justify-center relative" style={{
      marginBottom: showAnimals ? '2rem' : '1.5rem'
    }}>
        <img 
          src={petidLogo} 
          alt="Petid Logo" 
          className="h-16 w-auto object-contain"
        />
        
        {/* Blinking Paw over the "i" */}
        <motion.div className="absolute" style={{
        top: '-8px',
        left: '50%',
        transform: 'translateX(-50%)',
        marginLeft: '2px'
      }} animate={{
        opacity: [1, 0.3, 1],
        scale: [1, 0.95, 1]
      }} transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}>
          
        </motion.div>
      </div>

      {/* Animated Pet Icons - Walking towards each other */}
      {showAnimals && <div className="flex justify-center items-end gap-4 mb-8 relative h-[140px]">
          <motion.div initial={{
        x: -150,
        opacity: 0
      }} animate={{
        x: 0,
        opacity: 1
      }} transition={{
        duration: 1.2,
        delay: 0.3,
        ease: "easeOut"
      }} className="flex-shrink-0">
            <img src={dogIcon} alt="Dog" className="w-[110px] h-[110px] object-contain" />
          </motion.div>
          <motion.div initial={{
        x: 150,
        opacity: 0
      }} animate={{
        x: 0,
        opacity: 1
      }} transition={{
        duration: 1.2,
        delay: 0.3,
        ease: "easeOut"
      }} className="flex-shrink-0">
            <img src={catIcon} alt="Cat" className="w-[110px] h-[110px] object-contain" />
          </motion.div>
        </div>}
    </div>;
};