import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Plus } from 'lucide-react';

const Profile = () => {
  const [name, setName] = useState('');
  const [journalingGoals, setJournalingGoals] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [newHabit, setNewHabit] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      setName(profile.name || '');
      setJournalingGoals(profile.journaling_goals || '');
    }

    const { data: interestsData } = await supabase
      .from('user_interests')
      .select('interest')
      .eq('user_id', user.id);

    if (interestsData) {
      setInterests(interestsData.map(i => i.interest));
    }

    const { data: habitsData } = await supabase
      .from('user_habits')
      .select('*')
      .eq('user_id', user.id);

    if (habitsData) {
      setHabits(habitsData);
    }
  };

  const addInterest = async () => {
    if (!user || !newInterest.trim()) return;
    
    try {
      await supabase
        .from('user_interests')
        .insert({ user_id: user.id, interest: newInterest.trim() });
      
      setInterests([...interests, newInterest.trim()]);
      setNewInterest('');
      
      toast({
        title: 'Success!',
        description: 'Interest added',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const removeInterest = async (interest: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', user.id)
        .eq('interest', interest);
      
      setInterests(interests.filter(i => i !== interest));
      
      toast({
        title: 'Success!',
        description: 'Interest removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const addHabit = async () => {
    if (!user || !newHabit.trim()) return;
    
    try {
      const { data } = await supabase
        .from('user_habits')
        .insert({
          user_id: user.id,
          description: newHabit.trim(),
          habit_type: 'custom'
        })
        .select()
        .single();
      
      if (data) {
        setHabits([...habits, data]);
      }
      setNewHabit('');
      
      toast({
        title: 'Success!',
        description: 'Habit added',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const removeHabit = async (habitId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('user_habits')
        .delete()
        .eq('id', habitId)
        .eq('user_id', user.id);
      
      setHabits(habits.filter(h => h.id !== habitId));
      
      toast({
        title: 'Success!',
        description: 'Habit removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    try {
      await supabase
        .from('profiles')
        .update({ name, journaling_goals: journalingGoals })
        .eq('id', user.id);

      toast({
        title: 'Success!',
        description: 'Profile updated successfully',
      });
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-3xl">
        <div className="mb-6 sm:mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')} 
            className="mb-4 min-h-[44px]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl sm:text-4xl font-bold">Profile Settings</h1>
        </div>

        <div className="bg-card border-2 border-border rounded-2xl p-4 sm:p-8 shadow-xl space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-4">User Info</h2>
            <div className="space-y-4">
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
              <div>
                <Label htmlFor="email" className="text-base">Email (read-only)</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="min-h-[44px] text-base"
                />
              </div>
              <div>
                <Label htmlFor="goals" className="text-base">Journaling Goals</Label>
                <Textarea
                  id="goals"
                  value={journalingGoals}
                  onChange={(e) => setJournalingGoals(e.target.value)}
                  placeholder="What do you hope to achieve with journaling?"
                  className="min-h-[100px] text-base"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Your Interests</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {interests.map((interest, i) => (
                <div key={i} className="px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-full flex items-center gap-2 text-sm sm:text-base min-h-[36px]">
                  {interest}
                  <button
                    onClick={() => removeInterest(interest)}
                    className="hover:bg-primary-foreground/20 rounded-full p-1 min-w-[24px] min-h-[24px]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {interests.length === 0 && (
                <p className="text-muted-foreground text-sm sm:text-base">No interests set yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                placeholder="Add a new interest..."
                onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                className="min-h-[44px] text-base"
              />
              <Button 
                onClick={addInterest} 
                size="icon"
                className="min-w-[44px] min-h-[44px]"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Comfort Habits</h2>
            <div className="space-y-2 mb-4">
              {habits.map((habit) => (
                <div key={habit.id} className="p-3 bg-secondary/20 rounded-lg border border-border flex items-center justify-between min-h-[48px]">
                  <span className="text-sm sm:text-base">{habit.description}</span>
                  <button
                    onClick={() => removeHabit(habit.id)}
                    className="hover:bg-destructive/20 rounded-full p-2 min-w-[36px] min-h-[36px]"
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              ))}
              {habits.length === 0 && (
                <p className="text-muted-foreground text-sm sm:text-base">No habits set yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                placeholder="Add a new habit..."
                onKeyPress={(e) => e.key === 'Enter' && addHabit()}
                className="min-h-[44px] text-base"
              />
              <Button 
                onClick={addHabit} 
                size="icon"
                className="min-w-[44px] min-h-[44px]"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
            <Button 
              onClick={handleSave} 
              disabled={loading} 
              className="flex-1 min-h-[48px] text-base"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button 
              onClick={signOut} 
              variant="outline"
              className="min-h-[48px] text-base"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
