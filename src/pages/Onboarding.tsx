import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Check } from 'lucide-react';

const PRESET_INTERESTS = [
  '🧋 Bubble tea', '🚶 Long walks', '🎮 Gaming', '🎵 Music', '📚 Reading',
  '🏋️ Gym/Exercise', '💃 Dancing', '🎨 Art/Creative', '🍕 Food/Cooking',
  '🧘 Meditation', '☕ Coffee shops', '🌳 Nature', '🎬 Movies', '👥 Social time'
];

const PRESET_HABITS = [
  'Talk to a friend', 'Take a walk', 'Listen to music', 'Watch comfort shows',
  'Journal/write', 'Exercise', 'Sleep/rest', 'Eat comfort food', 'Creative activities'
];

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [customHabit, setCustomHabit] = useState('');
  const [timePreference, setTimePreference] = useState('');
  const [locationPreference, setLocationPreference] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const toggleHabit = (habit: string) => {
    setSelectedHabits(prev =>
      prev.includes(habit) ? prev.filter(h => h !== habit) : [...prev, habit]
    );
  };

  const addCustomInterest = () => {
    if (customInterest.trim()) {
      setSelectedInterests(prev => [...prev, customInterest.trim()]);
      setCustomInterest('');
    }
  };

  const addCustomHabit = () => {
    if (customHabit.trim()) {
      setSelectedHabits(prev => [...prev, customHabit.trim()]);
      setCustomHabit('');
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);

    try {
      await supabase
        .from('profiles')
        .update({ name, onboarding_completed: true })
        .eq('id', user.id);

      if (selectedInterests.length > 0) {
        await supabase
          .from('user_interests')
          .insert(selectedInterests.map(interest => ({ user_id: user.id, interest })));
      }

      if (selectedHabits.length > 0) {
        await supabase
          .from('user_habits')
          .insert(selectedHabits.map(habit => ({
            user_id: user.id,
            description: habit,
            habit_type: 'comfort',
            time_preference: timePreference || null,
            location_preference: locationPreference || null
          })));
      }

      toast({
        title: 'Welcome! ✨',
        description: "You're all set. Let's start reflecting!",
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Welcome! 👋</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Let's personalize your experience</p>
          <div className="flex gap-2 justify-center mt-4">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`h-2 w-10 sm:w-12 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
        </div>

        <div className="bg-card border-2 border-border rounded-2xl p-4 sm:p-8 shadow-xl">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold">What's your name?</h2>
              <div>
                <Label htmlFor="name" className="text-base">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="min-h-[44px] text-base"
                />
              </div>
              <Button onClick={() => setStep(2)} disabled={!name.trim()} className="w-full min-h-[48px] text-base font-semibold">
                Next
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold">What brings you joy?</h2>
              <p className="text-muted-foreground text-sm sm:text-base">Select things you enjoy</p>
              <div className="flex flex-wrap gap-2 max-h-[50vh] overflow-y-auto">
                {PRESET_INTERESTS.map(interest => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-3 sm:px-4 py-2 min-h-[44px] text-sm sm:text-base rounded-full border-2 transition-colors ${
                      selectedInterests.includes(interest)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:border-primary'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                  placeholder="Add your own..."
                  onKeyPress={(e) => e.key === 'Enter' && addCustomInterest()}
                  className="min-h-[44px] text-base"
                />
                <Button onClick={addCustomInterest} className="min-h-[44px] text-base px-4 sm:px-6 whitespace-nowrap">Add</Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1 min-h-[48px] text-base font-semibold">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1 min-h-[48px] text-base font-semibold">
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold">What helps you feel better?</h2>
              <p className="text-muted-foreground text-sm sm:text-base">When you're sad, stressed, or tired</p>
              <div className="flex flex-wrap gap-2 max-h-[50vh] overflow-y-auto">
                {PRESET_HABITS.map(habit => (
                  <button
                    key={habit}
                    onClick={() => toggleHabit(habit)}
                    className={`px-3 sm:px-4 py-2 min-h-[44px] text-sm sm:text-base rounded-full border-2 transition-colors ${
                      selectedHabits.includes(habit)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:border-primary'
                    }`}
                  >
                    {habit}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={customHabit}
                  onChange={(e) => setCustomHabit(e.target.value)}
                  placeholder="Add your own..."
                  onKeyPress={(e) => e.key === 'Enter' && addCustomHabit()}
                  className="min-h-[44px] text-base"
                />
                <Button onClick={addCustomHabit} className="min-h-[44px] text-base px-4 sm:px-6 whitespace-nowrap">Add</Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setStep(2)} variant="outline" className="flex-1 min-h-[48px] text-base font-semibold">
                  Back
                </Button>
                <Button onClick={() => setStep(4)} className="flex-1 min-h-[48px] text-base font-semibold">
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold">When are you most active?</h2>
              <div>
                <Label className="text-base">Time preference</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { value: 'morning', label: '🌅 Morning person' },
                    { value: 'afternoon', label: '☀️ Afternoon energy' },
                    { value: 'evening', label: '🌙 Night owl' },
                    { value: 'any', label: '🔄 Flexible' }
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setTimePreference(value)}
                      className={`px-3 sm:px-4 py-3 min-h-[48px] text-sm sm:text-base rounded-lg border-2 transition-colors ${
                        timePreference === value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:border-primary'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-base">Activity preference</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[
                    { value: 'indoor', label: '🏠 Indoor' },
                    { value: 'outdoor', label: '🌳 Outdoor' },
                    { value: 'any', label: '🔄 Both' }
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setLocationPreference(value)}
                      className={`px-3 sm:px-4 py-3 min-h-[48px] text-sm sm:text-base rounded-lg border-2 transition-colors ${
                        locationPreference === value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:border-primary'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setStep(3)} variant="outline" className="flex-1 min-h-[48px] text-base font-semibold">
                  Back
                </Button>
                <Button onClick={handleFinish} disabled={loading} className="flex-1 min-h-[48px] text-base font-semibold">
                  {loading ? 'Finishing...' : 'Finish Setup'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
