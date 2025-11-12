import React, { useState, useEffect } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Alert, AlertDescription } from './ui/alert';
import { Eye, EyeOff, Plus, Trash2, Key, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { useToast } from './ui/use-toast';
import { CurlCommandGenerator } from './CurlCommandGenerator';
import type { Agent } from '../types/agent';

interface SecurityStepProps {
  formData: Partial<Agent>;
  setFormData: (data: Partial<Agent>) => void;
  agentId?: string;
}

interface APIKey {
  id: string;
  key: string;
  name?: string;
  active: boolean;
  created_at: string;
}

interface BasicAuthUser {
  id: string;
  username: string;
  password: string;
}

export const SecurityStep: React.FC<SecurityStepProps> = ({
  formData,
  setFormData,
  agentId
}) => {
  const { toast } = useToast();
  const [authEnabled, setAuthEnabled] = useState(formData.requiresAuth || false);
  const [authType, setAuthType] = useState<'api_key' | 'bearer' | 'basic' | 'oauth2' | 'custom'>(
    (formData.auth as any) || 'api_key'
  );

  // API Key state
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [apiKeyHeaderName, setApiKeyHeaderName] = useState(
    formData.authConfig?.header_name || 'X-API-Key'
  );
  const [showApiKeys, setShowApiKeys] = useState<{ [key: string]: boolean }>({});

  // Bearer Token state
  const [bearerTokens, setBearerTokens] = useState(
    formData.authConfig?.allowed_tokens?.join('\n') || ''
  );

  // Basic Auth state
  const [basicAuthUsers, setBasicAuthUsers] = useState<BasicAuthUser[]>(
    formData.authConfig?.users || []
  );
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Test Authentication state
  const [testToken, setTestToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Auto-save state
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Initialize authentication data from formData
  useEffect(() => {
    if (formData.authConfig) {
      if (authType === 'api_key' && formData.authConfig.api_keys) {
        setApiKeys(formData.authConfig.api_keys);
      }
      if (authType === 'bearer' && formData.authConfig.allowed_tokens) {
        setBearerTokens(formData.authConfig.allowed_tokens.join('\n'));
      }
      if (authType === 'basic' && formData.authConfig.users) {
        setBasicAuthUsers(formData.authConfig.users);
      }
    }
  }, [formData.authConfig, authType]);

  // Auto-save draft for testing
  useEffect(() => {
    if (!authEnabled) return;

    const saveDraft = async () => {
      setSaving(true);
      try {
        const draftData = {
          slug: formData.slug || `draft-${Date.now()}`,
          name: formData.name || 'Draft Agent',
          auth_config: {
            required: authEnabled,
            type: authType,
            config: getAuthConfig()
          }
        };

        if (draftId) {
          // Update existing draft
          const { error } = await supabase
            .from('api_endpoints')
            .update(draftData)
            .eq('id', draftId);

          if (error) throw error;
        } else {
          // Create new draft
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('Not authenticated');
          }

          const { data, error } = await supabase
            .from('api_endpoints')
            .insert({
              ...draftData,
              user_id: user.id,
              is_draft: true
            })
            .select()
            .single();

          if (error) throw error;
          if (data) setDraftId(data.id);
        }

        setLastSaved(new Date());
      } catch (error: any) {
        console.error('Failed to save draft:', error);
      } finally {
        setSaving(false);
      }
    };

    // Debounce auto-save
    const timeoutId = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timeoutId);
  }, [authEnabled, authType, apiKeys, bearerTokens, basicAuthUsers, apiKeyHeaderName, draftId, formData.slug, formData.name]);

  // Cleanup draft on unmount
  useEffect(() => {
    return () => {
      if (draftId) {
        supabase
          .from('api_endpoints')
          .delete()
          .eq('id', draftId)
          .then(() => console.log('Draft cleaned up'));
      }
    };
  }, [draftId]);

  // Update parent formData when auth settings change
  useEffect(() => {
    setFormData({
      ...formData,
      requiresAuth: authEnabled,
      auth: authType,
      authConfig: authEnabled ? getAuthConfig() : undefined
    });
  }, [authEnabled, authType, apiKeys, bearerTokens, basicAuthUsers, apiKeyHeaderName]);

  const getAuthConfig = () => {
    switch (authType) {
      case 'api_key':
        return {
          header_name: apiKeyHeaderName,
          api_keys: apiKeys
        };
      case 'bearer':
        return {
          allowed_tokens: bearerTokens.split('\n').filter(t => t.trim())
        };
      case 'basic':
        return {
          users: basicAuthUsers
        };
      default:
        return {};
    }
  };

  // Generate a random API key
  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  // Add new API key
  const addApiKey = () => {
    const newKey: APIKey = {
      id: `key-${Date.now()}`,
      key: generateApiKey(),
      name: `API Key ${apiKeys.length + 1}`,
      active: true,
      created_at: new Date().toISOString()
    };
    setApiKeys([...apiKeys, newKey]);
    toast({
      title: 'API Key Generated',
      description: 'A new API key has been generated'
    });
  };

  // Remove API key
  const removeApiKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
  };

  // Toggle API key active status
  const toggleApiKeyActive = (id: string) => {
    setApiKeys(apiKeys.map(k =>
      k.id === id ? { ...k, active: !k.active } : k
    ));
  };

  // Toggle API key visibility
  const toggleApiKeyVisibility = (id: string) => {
    setShowApiKeys({ ...showApiKeys, [id]: !showApiKeys[id] });
  };

  // Add basic auth user
  const addBasicAuthUser = () => {
    if (!newUsername || !newPassword) {
      toast({
        title: 'Missing credentials',
        description: 'Please provide both username and password',
        variant: 'destructive'
      });
      return;
    }

    const newUser: BasicAuthUser = {
      id: `user-${Date.now()}`,
      username: newUsername,
      password: newPassword
    };

    setBasicAuthUsers([...basicAuthUsers, newUser]);
    setNewUsername('');
    setNewPassword('');
    toast({
      title: 'User Added',
      description: 'New user credentials have been added'
    });
  };

  // Remove basic auth user
  const removeBasicAuthUser = (id: string) => {
    setBasicAuthUsers(basicAuthUsers.filter(u => u.id !== id));
  };

  // Test authentication
  const testAuthentication = async () => {
    if (!testToken) {
      toast({
        title: 'Missing token',
        description: 'Please provide a token to test',
        variant: 'destructive'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Simulate authentication validation
      let isValid = false;

      switch (authType) {
        case 'api_key':
          isValid = apiKeys.some(k => k.key === testToken && k.active);
          break;
        case 'bearer':
          const tokens = bearerTokens.split('\n').filter(t => t.trim());
          isValid = tokens.includes(testToken);
          break;
        case 'basic':
          const [username, password] = testToken.split(':');
          isValid = basicAuthUsers.some(
            u => u.username === username && u.password === password
          );
          break;
      }

      setTestResult({
        success: isValid,
        message: isValid
          ? 'Authentication successful!'
          : 'Authentication failed: Invalid credentials'
      });

      toast({
        title: isValid ? 'Authentication Successful' : 'Authentication Failed',
        description: isValid
          ? 'The provided credentials are valid'
          : 'The provided credentials are invalid',
        variant: isValid ? 'default' : 'destructive'
      });

    } catch (error: any) {
      console.error('Test authentication error:', error);
      setTestResult({
        success: false,
        message: `Test failed: ${error.message}`
      });
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Authentication Toggle */}
      <div className="flex items-center gap-3">
        <Switch
          id="auth-enabled"
          checked={authEnabled}
          onCheckedChange={setAuthEnabled}
        />
        <div className="space-y-0.5">
          <Label htmlFor="auth-enabled" className="text-base font-medium cursor-pointer">
            Enable Authentication
          </Label>
          <p className="text-sm text-muted-foreground">
            Require authentication to access this agent
          </p>
        </div>
      </div>

      {authEnabled && (
        <>
          {/* Auto-save indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Ready to test (saved {lastSaved.toLocaleTimeString()})</span>
              </>
            ) : null}
          </div>

          {/* Authentication Type Selection */}
          <div>
            <Label className="text-base font-medium mb-3 block">Authentication Type</Label>
            <RadioGroup value={authType} onValueChange={(value: any) => setAuthType(value)}>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="api_key" id="api_key" className="border-2 border-gray-700" />
                  <Label htmlFor="api_key" className="cursor-pointer font-normal">
                    API Key - Simple key-based authentication
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bearer" id="bearer" className="border-2 border-gray-700" />
                  <Label htmlFor="bearer" className="cursor-pointer font-normal">
                    Bearer Token - Token-based authentication
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="basic" id="basic" className="border-2 border-gray-700" />
                  <Label htmlFor="basic" className="cursor-pointer font-normal">
                    Basic Auth - Username and password authentication
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="oauth2" id="oauth2" className="border-2 border-gray-700" />
                  <Label htmlFor="oauth2" className="cursor-pointer font-normal">
                    OAuth 2.0 - OAuth 2.0 authentication
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" className="border-2 border-gray-700" />
                  <Label htmlFor="custom" className="cursor-pointer font-normal">
                    Custom - Custom authentication method
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* API Key Configuration */}
          {authType === 'api_key' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">API Key Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="header-name">Header Name</Label>
                  <Input
                    id="header-name"
                    value={apiKeyHeaderName}
                    onChange={(e) => setApiKeyHeaderName(e.target.value)}
                    placeholder="X-API-Key"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The HTTP header name where the API key will be sent
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>API Keys</Label>
                    <Button size="sm" onClick={addApiKey}>
                      <Plus className="h-4 w-4 mr-2" />
                      Generate Key
                    </Button>
                  </div>

                  {apiKeys.length === 0 ? (
                    <Alert>
                      <div className="flex gap-3">
                        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <AlertDescription>
                          No API keys configured. Generate at least one key to enable authentication.
                        </AlertDescription>
                      </div>
                    </Alert>
                  ) : (
                    <div className="space-y-2">
                      {apiKeys.map((apiKey) => (
                        <Card key={apiKey.id} className="p-3">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={apiKey.active}
                              onCheckedChange={() => toggleApiKeyActive(apiKey.id)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Input
                                  type={showApiKeys[apiKey.id] ? 'text' : 'password'}
                                  value={apiKey.key}
                                  readOnly
                                  className="font-mono text-xs"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleApiKeyVisibility(apiKey.id)}
                                >
                                  {showApiKeys[apiKey.id] ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    navigator.clipboard.writeText(apiKey.key);
                                    toast({
                                      title: 'Copied!',
                                      description: 'API key copied to clipboard'
                                    });
                                  }}
                                >
                                  <Key className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeApiKey(apiKey.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {apiKey.active ? 'Active' : 'Inactive'} • Created {new Date(apiKey.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bearer Token Configuration */}
          {authType === 'bearer' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bearer Token Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bearer-tokens">Allowed Tokens</Label>
                  <Textarea
                    id="bearer-tokens"
                    value={bearerTokens}
                    onChange={(e) => setBearerTokens(e.target.value)}
                    placeholder="Enter one token per line&#10;token1&#10;token2&#10;token3"
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter one bearer token per line. Only these tokens will be accepted.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Basic Auth Configuration */}
          {authType === 'basic' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Auth Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Add User Credentials</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Button onClick={addBasicAuthUser}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {basicAuthUsers.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No users configured. Add at least one username/password pair.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    <Label>Configured Users</Label>
                    {basicAuthUsers.map((user) => (
                      <Card key={user.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-xs text-muted-foreground">
                              Password: {user.password.replace(/./g, '•')}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeBasicAuthUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* OAuth2 Configuration */}
          {authType === 'oauth2' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">OAuth 2.0 Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    OAuth 2.0 configuration will be available in a future update.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Custom Authentication Configuration */}
          {authType === 'custom' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custom Authentication Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Custom authentication configuration will be available in a future update.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Test Authentication */}
          {authType !== 'oauth2' && authType !== 'custom' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Test Authentication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="test-token">
                    {authType === 'api_key' && 'API Key'}
                    {authType === 'bearer' && 'Bearer Token'}
                    {authType === 'basic' && 'Username:Password'}
                  </Label>
                  <Input
                    id="test-token"
                    type={authType === 'basic' ? 'text' : 'password'}
                    value={testToken}
                    onChange={(e) => setTestToken(e.target.value)}
                    placeholder={
                      authType === 'api_key' ? 'Enter API key to test' :
                      authType === 'bearer' ? 'Enter bearer token to test' :
                      'Enter username:password'
                    }
                  />
                </div>

                <Button
                  onClick={testAuthentication}
                  disabled={!testToken || testing}
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Test Authentication
                    </>
                  )}
                </Button>

                {testResult && (
                  <Alert className={testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                    <div className="flex gap-3">
                      {testResult.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className={testResult.success ? 'text-green-900' : 'text-red-900'}>
                        <strong className="text-sm">
                          {testResult.success ? 'Authentication Successful' : 'Authentication Failed'}
                        </strong>
                        <pre className="mt-2 text-xs overflow-auto">
                          {JSON.stringify(testResult, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Curl Command Generator */}
          {formData.slug && (
            <CurlCommandGenerator
              endpoint={{
                slug: formData.slug,
                authentication: {
                  required: authEnabled,
                  type: authType,
                  config: getAuthConfig()
                }
              }}
            />
          )}
        </>
      )}

      {/* Security Note */}
      <Alert className="bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <Key className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-blue-900">
            <strong className="text-sm">Security Note</strong>
            <p className="text-sm mt-1">
              {authEnabled
                ? 'Authentication is enabled. Only requests with valid credentials will be able to access this agent.'
                : 'This agent will be publicly accessible without authentication. Enable authentication to protect sensitive data.'}
            </p>
          </div>
        </div>
      </Alert>
    </div>
  );
};

export default SecurityStep;
