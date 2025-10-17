import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Profile = () => {
  const [name, setName] = useState('');
  const [journalingGoals, setJournalingGoals] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
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
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-4xl font-bold">Profile Settings</h1>
        </div>

        <div className="bg-card border-2 border-border rounded-2xl p-8 shadow-xl space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">User Info</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email (read-only)</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="goals">Journaling Goals</Label>
                <Textarea
                  id="goals"
                  value={journalingGoals}
                  onChange={(e) => setJournalingGoals(e.target.value)}
                  placeholder="What do you hope to achieve with journaling?"
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Your Interests</h2>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest, i) => (
                <div key={i} className="px-4 py-2 bg-primary text-primary-foreground rounded-full">
                  {interest}
                </div>
              ))}
              {interests.length === 0 && (
                <p className="text-muted-foreground">No interests set yet</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Comfort Habits</h2>
            <div className="space-y-2">
              {habits.map((habit, i) => (
                <div key={i} className="p-3 bg-secondary/20 rounded-lg border border-border">
                  {habit.description}
                </div>
              ))}
              {habits.length === 0 && (
                <p className="text-muted-foreground">No habits set yet</p>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button onClick={signOut} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
