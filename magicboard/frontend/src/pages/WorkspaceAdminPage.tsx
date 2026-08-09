import {
  Download,
  ExternalLink,
  Plus,
  RefreshCw,
  Send,
  Trash2
} from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import AdminNav from "../components/admin/AdminNav";
import { ADMIN_SECTIONS, parseAdminSection, type AdminSection } from "../components/admin/adminSections";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import Select from "../components/ui/Select";
import Skeleton from "../components/ui/Skeleton";
import { useAuth } from "../hooks/useAuth";
import { useApi } from "../hooks/useApi";
import { useToast } from "../components/ui/ToastProvider";
import { adminService } from "../services/adminService";
import { boardSettingsService } from "../services/boardSettingsService";
import { enterpriseService } from "../services/enterpriseService";
import { integrationService } from "../services/integrationService";
import { projectService } from "../services/projectService";
import { workspaceService } from "../services/workspaceService";
import type { EmailTemplate, IssueTypeScheme, WorkflowTransitionRule } from "../types/admin";
import type { PermissionScheme } from "../types/enterprise";
import type { WorkflowTransition } from "../types/boardSettings";
import type { WorkflowStatus } from "../types/project";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";
import { applyWorkspaceBranding } from "../utils/workspaceBranding";
import { setActiveWorkspaceId } from "../utils/workspaceState";

const PERMISSION_OPTIONS = [
  { label: "Browse projects", value: "BROWSE_PROJECTS" },
  { label: "Create work items", value: "CREATE_ISSUES" },
  { label: "Edit work items", value: "EDIT_ISSUES" },
  { label: "Transition work items", value: "TRANSITION_ISSUES" },
  { label: "Administer project", value: "ADMINISTER_PROJECTS" }
];

const ROLE_OPTIONS = [
  { label: "Admin", value: "ADMIN" },
  { label: "Member", value: "MEMBER" },
  { label: "Viewer", value: "VIEWER" }
];

const ISSUE_TYPE_OPTIONS = ["EPIC", "STORY", "TASK", "BUG", "SUBTASK"] as const;

const RULE_KINDS = [
  { label: "Condition", value: "CONDITION" },
  { label: "Validator", value: "VALIDATOR" },
  { label: "Post function", value: "POST_FUNCTION" }
] as const;

const RULE_TYPES: Record<string, { label: string; value: string }[]> = {
  CONDITION: [
    { label: "User in role", value: "user_in_role" },
    { label: "User in group", value: "user_in_group" },
    { label: "Field equals", value: "field_equals" },
    { label: "Issue type in", value: "issue_type_in" }
  ],
  VALIDATOR: [
    { label: "Required field", value: "required_field" },
    { label: "Comment required", value: "comment_required" },
    { label: "Not blocked", value: "not_blocked" }
  ],
  POST_FUNCTION: [
    { label: "Set field", value: "set_field" },
    { label: "Assign to role", value: "assign_to_role" },
    { label: "Add comment", value: "add_comment" },
    { label: "Clear blocked", value: "clear_blocked" },
    { label: "Create Magicboard page", value: "create_magicboard_page" }
  ]
};

type TemplateDraft = {
  key: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
};

export default function WorkspaceAdminPage() {
  const { workspaceId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pushToast } = useToast();
  const section = parseAdminSection(new URLSearchParams(location.search).get("section"));

  const { data: workspace, isLoading, error, reload } = useApi(
    () => workspaceService.getWorkspace(workspaceId),
    [workspaceId]
  );
  const { data: overview } = useApi(() => workspaceService.getOverview(workspaceId), [workspaceId]);
  const { data: members, reload: reloadMembers } = useApi(
    () => workspaceService.listMembers(workspaceId),
    [workspaceId]
  );
  const { data: invitations, reload: reloadInvitations } = useApi(
    () => workspaceService.listInvitations(workspaceId),
    [workspaceId]
  );
  const { data: groups, reload: reloadGroups } = useApi(
    () => enterpriseService.listGroups(workspaceId),
    [workspaceId]
  );
  const { data: apiTokens, reload: reloadTokens } = useApi(() => enterpriseService.listApiTokens(), [workspaceId]);
  const { data: ssoConfig, reload: reloadSso } = useApi(
    () => enterpriseService.getSsoConfig(workspaceId),
    [workspaceId]
  );
  const { data: projectPage } = useApi(
    () => projectService.listProjects(workspaceId, { page_size: 100 }),
    [workspaceId]
  );
  const { data: plugins, reload: reloadPlugins } = useApi(
    () => integrationService.listPlugins(workspaceId),
    [workspaceId]
  );
  const { data: slackConfig, reload: reloadSlack } = useApi(
    () => integrationService.getSlackConfig(workspaceId),
    [workspaceId]
  );
  const { data: smtpSettings, reload: reloadSmtp } = useApi(
    () => adminService.getSmtp(workspaceId),
    [workspaceId]
  );
  const { data: emailTemplates, reload: reloadTemplates } = useApi(
    () => adminService.listEmailTemplates(workspaceId),
    [workspaceId]
  );
  const { data: domains, reload: reloadDomains } = useApi(
    () => adminService.listDomains(workspaceId),
    [workspaceId]
  );
  const { data: dnsProvider, reload: reloadDns } = useApi(
    () => adminService.getDnsProvider(workspaceId),
    [workspaceId]
  );
  const { data: issueTypeSchemes, reload: reloadSchemes } = useApi(
    () => adminService.listIssueTypeSchemes(workspaceId),
    [workspaceId]
  );
  const { data: marketplaceCatalog, reload: reloadMarketplace } = useApi(
    () => adminService.listMarketplace(workspaceId),
    [workspaceId]
  );

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [newGroupName, setNewGroupName] = useState("");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupMemberPick, setGroupMemberPick] = useState<Record<string, string>>({});
  const [newTokenName, setNewTokenName] = useState("");
  const [createdTokenSecret, setCreatedTokenSecret] = useState<string | null>(null);
  const [ssoProvider, setSsoProvider] = useState("oidc");
  const [ssoClientId, setSsoClientId] = useState("");
  const [ssoClientSecret, setSsoClientSecret] = useState("");
  const [ssoIssuer, setSsoIssuer] = useState("");
  const [ssoIdpEntityId, setSsoIdpEntityId] = useState("");
  const [ssoIdpSsoUrl, setSsoIdpSsoUrl] = useState("");
  const [ssoIdpX509Cert, setSsoIdpX509Cert] = useState("");
  const [ssoSpEntityId, setSsoSpEntityId] = useState("");
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [workspaceVisibility, setWorkspaceVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#6366f1");
  const [brandName, setBrandName] = useState("");
  const [brandTagline, setBrandTagline] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [permissionScheme, setPermissionScheme] = useState<PermissionScheme | null>(null);
  const [grantPermission, setGrantPermission] = useState("BROWSE_PROJECTS");
  const [grantHolderType, setGrantHolderType] = useState<"WORKSPACE_ROLE" | "GROUP">("WORKSPACE_ROLE");
  const [grantRole, setGrantRole] = useState("MEMBER");
  const [grantGroupId, setGrantGroupId] = useState("");
  const [pluginName, setPluginName] = useState("");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [slackChannel, setSlackChannel] = useState("");
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpUseTls, setSmtpUseTls] = useState(true);
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");
  const [smtpEnabled, setSmtpEnabled] = useState(false);
  const [templateDrafts, setTemplateDrafts] = useState<TemplateDraft[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [dnsProviderName, setDnsProviderName] = useState("mock");
  const [dnsApiToken, setDnsApiToken] = useState("");
  const [dnsZoneId, setDnsZoneId] = useState("");
  const [dnsEnabled, setDnsEnabled] = useState(false);
  const [newSchemeName, setNewSchemeName] = useState("");
  const [newSchemeTypes, setNewSchemeTypes] = useState<string[]>(["STORY", "TASK", "BUG"]);
  const [assignSchemeProjectId, setAssignSchemeProjectId] = useState("");
  const [assignSchemeId, setAssignSchemeId] = useState("");
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [workflowStatuses, setWorkflowStatuses] = useState<WorkflowStatus[]>([]);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusKey, setNewStatusKey] = useState("");
  const [selectedTransitionId, setSelectedTransitionId] = useState("");
  const [transitionRules, setTransitionRules] = useState<WorkflowTransitionRule[]>([]);
  const [transitionFrom, setTransitionFrom] = useState("");
  const [transitionTo, setTransitionTo] = useState("");
  const [transitionName, setTransitionName] = useState("");
  const [ruleKind, setRuleKind] = useState("CONDITION");
  const [ruleType, setRuleType] = useState("user_in_role");
  const [ruleConfigRole, setRuleConfigRole] = useState("MEMBER");
  const [ruleConfigField, setRuleConfigField] = useState("");
  const [ruleConfigValue, setRuleConfigValue] = useState("");
  const [ruleConfigJson, setRuleConfigJson] = useState("{}");

  useEffect(() => {
    if (workspaceId) setActiveWorkspaceId(workspaceId);
  }, [workspaceId]);

  useEffect(() => {
    if (workspace) {
      setWorkspaceName(workspace.name);
      setWorkspaceSlug(workspace.slug);
      setWorkspaceDescription(workspace.description ?? "");
      setWorkspaceVisibility(workspace.visibility);
      setLogoUrl(workspace.logo_url ?? "");
      setAccentColor(workspace.accent_color || "#0f766e");
      setBrandName(workspace.brand_name ?? "");
      setBrandTagline(workspace.brand_tagline ?? "");
    }
  }, [workspace]);

  useEffect(() => {
    if (ssoConfig) {
      setSsoProvider(ssoConfig.provider || "oidc");
      setSsoClientId(ssoConfig.client_id ?? "");
      setSsoIssuer(ssoConfig.issuer ?? "");
      setSsoIdpEntityId(ssoConfig.idp_entity_id ?? "");
      setSsoIdpSsoUrl(ssoConfig.idp_sso_url ?? "");
      setSsoIdpX509Cert(ssoConfig.idp_x509_cert ?? "");
      setSsoSpEntityId(ssoConfig.sp_entity_id ?? "");
      setSsoEnabled(ssoConfig.enabled);
      setSsoClientSecret("");
    }
  }, [ssoConfig]);

  useEffect(() => {
    if (slackConfig) {
      setSlackWebhook(slackConfig.webhook_url ?? "");
      setSlackChannel(slackConfig.default_channel ?? "");
      setSlackEnabled(slackConfig.enabled);
    }
  }, [slackConfig]);

  useEffect(() => {
    if (smtpSettings) {
      setSmtpHost(smtpSettings.host ?? "");
      setSmtpPort(String(smtpSettings.port ?? 587));
      setSmtpUsername(smtpSettings.username ?? "");
      setSmtpPassword("");
      setSmtpUseTls(smtpSettings.use_tls);
      setSmtpFromEmail(smtpSettings.from_email ?? "");
      setSmtpFromName(smtpSettings.from_name ?? "");
      setSmtpEnabled(smtpSettings.enabled);
    }
  }, [smtpSettings]);

  useEffect(() => {
    if (emailTemplates) {
      setTemplateDrafts(
        emailTemplates.map((template) => ({
          key: template.key,
          name: template.name,
          subject: template.subject,
          body_html: template.body_html,
          body_text: template.body_text
        }))
      );
    }
  }, [emailTemplates]);

  useEffect(() => {
    if (dnsProvider) {
      setDnsProviderName(dnsProvider.provider || "mock");
      setDnsZoneId(dnsProvider.zone_id ?? "");
      setDnsEnabled(dnsProvider.enabled);
      setDnsApiToken("");
    }
  }, [dnsProvider]);

  useEffect(() => {
    if (!selectedProjectId && projectPage?.items[0]) {
      setSelectedProjectId(projectPage.items[0].id);
    }
    if (!assignSchemeProjectId && projectPage?.items[0]) {
      setAssignSchemeProjectId(projectPage.items[0].id);
    }
  }, [projectPage, selectedProjectId, assignSchemeProjectId]);

  useEffect(() => {
    if (!selectedProjectId || section !== "permissions") return;
    void enterpriseService
      .getPermissionScheme(selectedProjectId)
      .then(setPermissionScheme)
      .catch(() => setPermissionScheme(null));
  }, [selectedProjectId, section]);

  const loadWorkflowDesigner = useCallback(async () => {
    if (!selectedProjectId) {
      setTransitions([]);
      setWorkflowStatuses([]);
      return;
    }
    const [overviewData, items] = await Promise.all([
      projectService.getOverview(selectedProjectId),
      boardSettingsService.listTransitions(selectedProjectId)
    ]);
    const statuses = overviewData.workflow_statuses ?? [];
    setWorkflowStatuses(statuses);
    setTransitions(items);
    if (statuses.length) {
      setTransitionFrom((current) => current || statuses[0].id);
      setTransitionTo((current) => current || statuses[Math.min(1, statuses.length - 1)].id);
    }
    if (items.length && !items.some((item) => item.id === selectedTransitionId)) {
      setSelectedTransitionId(items[0].id);
    } else if (!items.length) {
      setSelectedTransitionId("");
    }
  }, [selectedProjectId, selectedTransitionId]);

  useEffect(() => {
    if (section !== "workflows" || !selectedProjectId) return;
    void loadWorkflowDesigner();
  }, [section, selectedProjectId, loadWorkflowDesigner]);

  useEffect(() => {
    if (!selectedTransitionId || section !== "workflows") {
      setTransitionRules([]);
      return;
    }
    void boardSettingsService
      .listTransitionRules(selectedTransitionId)
      .then(setTransitionRules)
      .catch(() => setTransitionRules([]));
  }, [selectedTransitionId, section]);

  useEffect(() => {
    const types = RULE_TYPES[ruleKind] ?? [];
    if (types.length && !types.some((item) => item.value === ruleType)) {
      setRuleType(types[0].value);
    }
  }, [ruleKind, ruleType]);

  const currentMember = useMemo(
    () => members?.find((member) => member.user_id === user?.id) ?? null,
    [members, user?.id]
  );
  const isAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";
  const isOwner = currentMember?.role === "OWNER";

  const memberRoleOptions = useMemo(() => {
    if (isOwner) {
      return [{ label: "Owner", value: "OWNER" }, ...ROLE_OPTIONS];
    }
    return ROLE_OPTIONS;
  }, [isOwner]);

  const projectOptions = useMemo(
    () =>
      (projectPage?.items ?? []).map((project) => ({
        label: `${project.key} · ${project.name}`,
        value: project.id
      })),
    [projectPage]
  );

  const groupOptions = useMemo(
    () => (groups ?? []).map((group) => ({ label: group.name, value: group.id })),
    [groups]
  );

  const memberOptions = useMemo(
    () =>
      (members ?? []).map((member) => ({
        label: `${member.user.name} (${member.user.email})`,
        value: member.user_id
      })),
    [members]
  );

  const schemeOptions = useMemo(
    () => (issueTypeSchemes ?? []).map((scheme) => ({ label: scheme.name, value: scheme.id })),
    [issueTypeSchemes]
  );

  const statusOptions = useMemo(
    () =>
      workflowStatuses.map((status) => ({
        label: `${status.name} (${status.key})`,
        value: status.id
      })),
    [workflowStatuses]
  );

  const statusLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const status of workflowStatuses) {
      map.set(status.id, status.name);
    }
    return map;
  }, [workflowStatuses]);

  function goToSection(next: AdminSection) {
    navigate(`/workspaces/${workspaceId}/admin?section=${next}`);
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    try {
      await workspaceService.inviteMember(workspaceId, inviteEmail, inviteRole);
      pushToast("Invitation sent", "success");
      setInviteEmail("");
      await reloadInvitations();
    } catch (inviteError) {
      pushToast(getApiErrorMessage(inviteError, "Invite failed"), "error");
    }
  }

  async function handleResendInvitation(invitationId: string) {
    try {
      await workspaceService.resendInvitation(workspaceId, invitationId);
      pushToast("Invitation resent", "success");
      await reloadInvitations();
    } catch (resendError) {
      pushToast(getApiErrorMessage(resendError, "Could not resend invitation"), "error");
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    try {
      await workspaceService.revokeInvitation(workspaceId, invitationId);
      pushToast("Invitation revoked", "success");
      await reloadInvitations();
    } catch (revokeError) {
      pushToast(getApiErrorMessage(revokeError, "Could not revoke invitation"), "error");
    }
  }

  async function handleRoleChange(userId: string, role: string) {
    try {
      await workspaceService.updateMemberRole(workspaceId, userId, role);
      pushToast("Role updated", "success");
      await reloadMembers();
    } catch (roleError) {
      pushToast(getApiErrorMessage(roleError, "Could not update role"), "error");
    }
  }

  async function handleRemoveMember(userId: string) {
    try {
      await workspaceService.removeMember(workspaceId, userId);
      pushToast("Member removed", "success");
      await reloadMembers();
    } catch (removeError) {
      pushToast(getApiErrorMessage(removeError, "Could not remove member"), "error");
    }
  }

  async function handleCreateGroup(event: FormEvent) {
    event.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      await enterpriseService.createGroup(workspaceId, newGroupName.trim());
      setNewGroupName("");
      pushToast("Group created", "success");
      await reloadGroups();
    } catch (groupError) {
      pushToast(getApiErrorMessage(groupError, "Could not create group"), "error");
    }
  }

  async function handleDeleteGroup(groupId: string) {
    try {
      await enterpriseService.deleteGroup(groupId);
      if (expandedGroupId === groupId) setExpandedGroupId(null);
      pushToast("Group removed", "success");
      await reloadGroups();
    } catch (groupError) {
      pushToast(getApiErrorMessage(groupError, "Could not remove group"), "error");
    }
  }

  async function handleAddGroupMember(groupId: string) {
    const userId = groupMemberPick[groupId];
    if (!userId) return;
    try {
      await enterpriseService.addGroupMember(groupId, userId);
      pushToast("Member added to group", "success");
      setGroupMemberPick((prev) => ({ ...prev, [groupId]: "" }));
      await reloadGroups();
    } catch (groupError) {
      pushToast(getApiErrorMessage(groupError, "Could not add group member"), "error");
    }
  }

  async function handleRemoveGroupMember(groupId: string, userId: string) {
    try {
      await enterpriseService.removeGroupMember(groupId, userId);
      pushToast("Member removed from group", "success");
      await reloadGroups();
    } catch (groupError) {
      pushToast(getApiErrorMessage(groupError, "Could not remove group member"), "error");
    }
  }

  async function handleCreateToken(event: FormEvent) {
    event.preventDefault();
    if (!newTokenName.trim()) return;
    try {
      const created = await enterpriseService.createApiToken(newTokenName.trim());
      setCreatedTokenSecret(created.secret);
      setNewTokenName("");
      pushToast("API token created", "success");
      await reloadTokens();
    } catch (tokenError) {
      pushToast(getApiErrorMessage(tokenError, "Could not create token"), "error");
    }
  }

  async function handleRevokeToken(tokenId: string) {
    try {
      await enterpriseService.revokeApiToken(tokenId);
      pushToast("Token revoked", "success");
      await reloadTokens();
    } catch (tokenError) {
      pushToast(getApiErrorMessage(tokenError, "Could not revoke token"), "error");
    }
  }

  async function handleSaveSso(event: FormEvent) {
    event.preventDefault();
    try {
      await enterpriseService.updateSsoConfig(workspaceId, {
        provider: ssoProvider,
        client_id: ssoClientId || null,
        client_secret: ssoClientSecret || null,
        issuer: ssoIssuer || null,
        idp_entity_id: ssoIdpEntityId || null,
        idp_sso_url: ssoIdpSsoUrl || null,
        idp_x509_cert: ssoIdpX509Cert || null,
        sp_entity_id: ssoSpEntityId || null,
        enabled: ssoEnabled
      });
      pushToast("SSO configuration saved", "success");
      await reloadSso();
    } catch (ssoError) {
      pushToast(getApiErrorMessage(ssoError, "Could not save SSO configuration"), "error");
    }
  }

  async function handleValidateSso() {
    try {
      const result = await enterpriseService.validateSso(workspaceId);
      if (result.valid) {
        pushToast("SSO configuration is valid", "success");
      } else {
        pushToast(result.reason ?? "SSO validation failed", "error");
      }
    } catch (validateError) {
      pushToast(getApiErrorMessage(validateError, "Could not validate SSO"), "error");
    }
  }

  async function handleGdprExport() {
    try {
      const data = await enterpriseService.requestGdprExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `gdpr-export-${user?.id ?? "account"}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      pushToast("GDPR export downloaded", "success");
    } catch (exportError) {
      pushToast(getApiErrorMessage(exportError, "Could not request export"), "error");
    }
  }

  async function handleWorkspaceUpdate(event: FormEvent) {
    event.preventDefault();
    try {
      await workspaceService.updateWorkspace(workspaceId, {
        name: workspaceName,
        slug: workspaceSlug,
        description: workspaceDescription,
        visibility: workspaceVisibility
      });
      pushToast("Workspace updated", "success");
      await reload();
    } catch (updateError) {
      pushToast(getApiErrorMessage(updateError, "Update failed"), "error");
    }
  }

  async function handleBrandingUpdate(event: FormEvent) {
    event.preventDefault();
    try {
      const updated = await workspaceService.updateWorkspace(workspaceId, {
        logo_url: logoUrl || null,
        accent_color: accentColor,
        brand_name: brandName || null,
        brand_tagline: brandTagline || null
      });
      applyWorkspaceBranding(updated.accent_color);
      pushToast("Branding saved", "success");
      await reload();
    } catch (updateError) {
      pushToast(getApiErrorMessage(updateError, "Could not save branding"), "error");
    }
  }

  async function handleDeleteWorkspace() {
    try {
      await workspaceService.deleteWorkspace(workspaceId);
      pushToast("Workspace deleted", "success");
      navigate("/workspaces");
    } catch (deleteError) {
      pushToast(getApiErrorMessage(deleteError, "Delete failed"), "error");
    } finally {
      setIsDeleteOpen(false);
    }
  }

  async function handleLoadScheme() {
    if (!selectedProjectId) return;
    try {
      const scheme = await enterpriseService.getPermissionScheme(selectedProjectId);
      setPermissionScheme(scheme);
    } catch (schemeError) {
      pushToast(getApiErrorMessage(schemeError, "Could not load permission scheme"), "error");
    }
  }

  async function handleCreateScheme() {
    if (!selectedProjectId) return;
    try {
      const scheme = await enterpriseService.createPermissionScheme(
        selectedProjectId,
        "Default Permission Scheme"
      );
      setPermissionScheme(scheme);
      pushToast("Permission scheme ready", "success");
    } catch (schemeError) {
      pushToast(getApiErrorMessage(schemeError, "Could not create scheme"), "error");
    }
  }

  async function handleDeleteGrant(grantId: string) {
    if (!selectedProjectId) return;
    try {
      await enterpriseService.deletePermissionGrant(selectedProjectId, grantId);
      pushToast("Grant removed", "success");
      await handleLoadScheme();
    } catch (grantError) {
      pushToast(getApiErrorMessage(grantError, "Could not delete grant"), "error");
    }
  }

  async function handleAddGrant(event: FormEvent) {
    event.preventDefault();
    if (!selectedProjectId) return;
    try {
      if (grantHolderType === "GROUP") {
        await enterpriseService.addPermissionGrant(selectedProjectId, {
          permission: grantPermission,
          holder_type: "GROUP",
          holder_id: grantGroupId
        });
      } else {
        await enterpriseService.addPermissionGrant(selectedProjectId, {
          permission: grantPermission,
          holder_type: "WORKSPACE_ROLE",
          holder_role: grantRole
        });
      }
      pushToast("Grant added", "success");
      await handleLoadScheme();
    } catch (grantError) {
      pushToast(getApiErrorMessage(grantError, "Could not add grant"), "error");
    }
  }

  async function handleCreateIssueTypeScheme(event: FormEvent) {
    event.preventDefault();
    if (!newSchemeName.trim() || !newSchemeTypes.length) return;
    try {
      await adminService.createIssueTypeScheme(workspaceId, {
        name: newSchemeName.trim(),
        work_item_types: newSchemeTypes
      });
      setNewSchemeName("");
      pushToast("Issue type scheme created", "success");
      await reloadSchemes();
    } catch (schemeError) {
      pushToast(getApiErrorMessage(schemeError, "Could not create scheme"), "error");
    }
  }

  async function handleDeleteIssueTypeScheme(schemeId: string) {
    try {
      await adminService.deleteIssueTypeScheme(schemeId);
      pushToast("Scheme deleted", "success");
      await reloadSchemes();
    } catch (schemeError) {
      pushToast(getApiErrorMessage(schemeError, "Could not delete scheme"), "error");
    }
  }

  async function handleAssignIssueTypeScheme(event: FormEvent) {
    event.preventDefault();
    if (!assignSchemeProjectId) return;
    try {
      await adminService.assignIssueTypeScheme(assignSchemeProjectId, assignSchemeId || null);
      pushToast("Scheme assigned to project", "success");
    } catch (assignError) {
      pushToast(getApiErrorMessage(assignError, "Could not assign scheme"), "error");
    }
  }

  async function handleCreateStatus(event: FormEvent) {
    event.preventDefault();
    if (!selectedProjectId || !newStatusName.trim() || !newStatusKey.trim()) return;
    try {
      await boardSettingsService.createStatus(selectedProjectId, {
        name: newStatusName.trim(),
        key: newStatusKey.trim().toUpperCase().replace(/\s+/g, "_")
      });
      setNewStatusName("");
      setNewStatusKey("");
      pushToast("Status created", "success");
      await loadWorkflowDesigner();
    } catch (statusError) {
      pushToast(getApiErrorMessage(statusError, "Could not create status"), "error");
    }
  }

  async function handleRenameStatus(status: WorkflowStatus) {
    const nextName = window.prompt("Rename status", status.name);
    if (!nextName || !nextName.trim() || nextName.trim() === status.name) return;
    try {
      await boardSettingsService.updateStatus(status.id, { name: nextName.trim() });
      pushToast("Status renamed", "success");
      await loadWorkflowDesigner();
    } catch (statusError) {
      pushToast(getApiErrorMessage(statusError, "Could not rename status"), "error");
    }
  }

  async function handleDeleteStatus(statusId: string) {
    try {
      await boardSettingsService.deleteStatus(statusId);
      pushToast("Status deleted", "success");
      await loadWorkflowDesigner();
    } catch (statusError) {
      pushToast(getApiErrorMessage(statusError, "Could not delete status"), "error");
    }
  }

  async function handleCreateTransition(event: FormEvent) {
    event.preventDefault();
    if (!selectedProjectId || !transitionFrom || !transitionTo) return;
    try {
      await boardSettingsService.createTransition(selectedProjectId, {
        from_status_id: transitionFrom,
        to_status_id: transitionTo,
        name: transitionName.trim() || undefined
      });
      setTransitionName("");
      pushToast("Transition created", "success");
      await loadWorkflowDesigner();
    } catch (transitionError) {
      pushToast(getApiErrorMessage(transitionError, "Could not create transition"), "error");
    }
  }

  async function handleDeleteTransition(transitionId: string) {
    try {
      await boardSettingsService.deleteTransition(transitionId);
      if (selectedTransitionId === transitionId) setSelectedTransitionId("");
      pushToast("Transition deleted", "success");
      await loadWorkflowDesigner();
    } catch (transitionError) {
      pushToast(getApiErrorMessage(transitionError, "Could not delete transition"), "error");
    }
  }

  function buildRuleConfig(): Record<string, unknown> {
    if (ruleConfigJson.trim() && ruleConfigJson.trim() !== "{}") {
      try {
        return JSON.parse(ruleConfigJson) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
    const config: Record<string, unknown> = {};
    if (ruleConfigRole) config.role = ruleConfigRole;
    if (ruleConfigField) config.field = ruleConfigField;
    if (ruleConfigValue) {
      config.value = ruleConfigValue;
      if (ruleType === "issue_type_in") {
        config.types = ruleConfigValue.split(",").map((part) => part.trim()).filter(Boolean);
      }
      if (ruleType === "user_in_group") {
        config.group_id = ruleConfigValue;
      }
      if (ruleType === "add_comment") {
        config.comment = ruleConfigValue;
      }
    }
    return config;
  }

  async function handleCreateRule(event: FormEvent) {
    event.preventDefault();
    if (!selectedTransitionId) return;
    try {
      await boardSettingsService.createTransitionRule(selectedTransitionId, {
        kind: ruleKind,
        rule_type: ruleType,
        config: buildRuleConfig()
      });
      pushToast("Rule added", "success");
      const rules = await boardSettingsService.listTransitionRules(selectedTransitionId);
      setTransitionRules(rules);
    } catch (ruleError) {
      pushToast(getApiErrorMessage(ruleError, "Could not add rule"), "error");
    }
  }

  async function handleDeleteRule(ruleId: string) {
    try {
      await boardSettingsService.deleteTransitionRule(ruleId);
      pushToast("Rule deleted", "success");
      if (selectedTransitionId) {
        const rules = await boardSettingsService.listTransitionRules(selectedTransitionId);
        setTransitionRules(rules);
      }
    } catch (ruleError) {
      pushToast(getApiErrorMessage(ruleError, "Could not delete rule"), "error");
    }
  }

  async function handleInstallPlugin(event: FormEvent) {
    event.preventDefault();
    if (!pluginName.trim()) return;
    try {
      await integrationService.installPlugin(workspaceId, pluginName.trim());
      setPluginName("");
      pushToast("Plugin installed", "success");
      await reloadPlugins();
    } catch (pluginError) {
      pushToast(getApiErrorMessage(pluginError, "Could not install plugin"), "error");
    }
  }

  async function handleTogglePlugin(pluginId: string, enabled: boolean) {
    try {
      await integrationService.updatePlugin(pluginId, { enabled });
      pushToast(enabled ? "Plugin enabled" : "Plugin disabled", "success");
      await reloadPlugins();
    } catch (pluginError) {
      pushToast(getApiErrorMessage(pluginError, "Could not update plugin"), "error");
    }
  }

  async function handleUninstallPlugin(pluginId: string) {
    try {
      await integrationService.uninstallPlugin(pluginId);
      pushToast("Plugin uninstalled", "success");
      await reloadPlugins();
    } catch (pluginError) {
      pushToast(getApiErrorMessage(pluginError, "Could not uninstall plugin"), "error");
    }
  }

  async function handleInstallMarketplace(catalogId: string) {
    try {
      await adminService.installMarketplaceApp(workspaceId, catalogId);
      pushToast("App installed from marketplace", "success");
      await reloadPlugins();
      await reloadMarketplace();
    } catch (marketError) {
      pushToast(getApiErrorMessage(marketError, "Could not install app"), "error");
    }
  }

  async function handleSaveSlack(event: FormEvent) {
    event.preventDefault();
    try {
      await integrationService.updateSlackConfig(workspaceId, {
        webhook_url: slackWebhook || null,
        default_channel: slackChannel || null,
        enabled: slackEnabled
      });
      pushToast("Slack settings saved", "success");
      await reloadSlack();
    } catch (slackError) {
      pushToast(getApiErrorMessage(slackError, "Could not save Slack settings"), "error");
    }
  }

  async function handleSaveSmtp(event: FormEvent) {
    event.preventDefault();
    try {
      await adminService.upsertSmtp(workspaceId, {
        host: smtpHost || null,
        port: Number(smtpPort) || 587,
        username: smtpUsername || null,
        password: smtpPassword || null,
        use_tls: smtpUseTls,
        from_email: smtpFromEmail || null,
        from_name: smtpFromName || null,
        enabled: smtpEnabled
      });
      pushToast("SMTP settings saved", "success");
      await reloadSmtp();
    } catch (smtpError) {
      pushToast(getApiErrorMessage(smtpError, "Could not save SMTP settings"), "error");
    }
  }

  async function handleTestSmtp() {
    if (!user?.email) {
      pushToast("No email on your account to send a test message", "error");
      return;
    }
    try {
      const result = await adminService.testSmtp(workspaceId, user.email);
      pushToast(result.detail ?? "Test email sent", "success");
    } catch (smtpError) {
      pushToast(getApiErrorMessage(smtpError, "SMTP test failed"), "error");
    }
  }

  async function handleSaveTemplates(event: FormEvent) {
    event.preventDefault();
    try {
      await adminService.upsertEmailTemplates(workspaceId, templateDrafts);
      pushToast("Email templates saved", "success");
      await reloadTemplates();
    } catch (templateError) {
      pushToast(getApiErrorMessage(templateError, "Could not save templates"), "error");
    }
  }

  function updateTemplateDraft(index: number, patch: Partial<TemplateDraft>) {
    setTemplateDrafts((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  }

  async function handleAddDomain(event: FormEvent) {
    event.preventDefault();
    if (!newDomain.trim()) return;
    try {
      await adminService.createDomain(workspaceId, newDomain.trim());
      setNewDomain("");
      pushToast("Domain added", "success");
      await reloadDomains();
    } catch (domainError) {
      pushToast(getApiErrorMessage(domainError, "Could not add domain"), "error");
    }
  }

  async function handleVerifyDomain(domainId: string) {
    try {
      await adminService.verifyDomain(domainId);
      pushToast("Domain verification requested", "success");
      await reloadDomains();
    } catch (domainError) {
      pushToast(getApiErrorMessage(domainError, "Could not verify domain"), "error");
    }
  }

  async function handleDeleteDomain(domainId: string) {
    try {
      await adminService.deleteDomain(domainId);
      pushToast("Domain removed", "success");
      await reloadDomains();
    } catch (domainError) {
      pushToast(getApiErrorMessage(domainError, "Could not delete domain"), "error");
    }
  }

  async function handleSaveDns(event: FormEvent) {
    event.preventDefault();
    try {
      await adminService.upsertDnsProvider(workspaceId, {
        provider: dnsProviderName,
        api_token: dnsApiToken || null,
        zone_id: dnsZoneId || null,
        enabled: dnsEnabled
      });
      pushToast("DNS provider saved", "success");
      await reloadDns();
    } catch (dnsError) {
      pushToast(getApiErrorMessage(dnsError, "Could not save DNS provider"), "error");
    }
  }

  function toggleSchemeType(type: string) {
    setNewSchemeTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]
    );
  }

  function renderDeleteWorkspaceCard() {
    if (!isOwner) return null;
    return (
      <Card>
        <div className="section-heading">
          <h2>Danger zone</h2>
        </div>
        <p className="muted-copy">
          Deleting a workspace removes access to all nested projects and their work history.
        </p>
        <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
          Delete workspace
        </Button>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <>
        <Skeleton className="skeleton-heading wide" />
        <Skeleton className="skeleton-line" />
      </>
    );
  }

  if (error || !workspace) {
    return <div className="error-banner">Workspace could not be loaded.</div>;
  }

  if (!members) {
    return (
      <>
        <Skeleton className="skeleton-heading wide" />
        <Skeleton className="skeleton-line" />
      </>
    );
  }

  if (!isAdmin) {
    return (
      <div className="work-item-detail">
        <PageHeader eyebrow="Administration" title="Access required" description={workspace.name} />
        <Card>
          <EmptyState
            title="Admin access required"
            description="Only workspace owners and admins can open Administration."
          />
          <Link to={`/workspaces/${workspaceId}`}>
            <Button variant="secondary">Back to workspace</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const samlMetadataUrl = `/api/workspaces/${workspaceId}/sso/saml/metadata`;
  const samlAcsUrl = `/api/workspaces/${workspaceId}/sso/saml/acs`;
  const activeSectionMeta = ADMIN_SECTIONS.find((item) => item.id === section);

  return (
    <div className="admin-console">
      <PageHeader
        eyebrow="Administration"
        title={activeSectionMeta?.label ?? workspace.name}
        description={
          section === "overview"
            ? `${workspace.name} · Manage users, permissions, security, and workspace configuration.`
            : `${workspace.name} · ${activeSectionMeta?.blurb ?? ""}`
        }
        actions={
          <Link to={`/workspaces/${workspaceId}`}>
            <Button variant="secondary">Back to workspace</Button>
          </Link>
        }
      />

      <div className="admin-layout">
        <aside className="admin-rail">
          <AdminNav workspaceId={workspaceId} activeSection={section} />
        </aside>

        <div className="admin-main">
          {section === "overview" ? (
            <div className="admin-overview-grid">
              {ADMIN_SECTIONS.filter((item) => item.id !== "overview").map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="admin-overview-card"
                  onClick={() => goToSection(item.id)}
                >
                  <span className="admin-overview-icon">{item.icon}</span>
                  <strong>{item.label}</strong>
                  <span>{item.blurb}</span>
                </button>
              ))}
              <Card className="metric-card">
                <span>Members</span>
                <strong>{overview?.total_members ?? members.length}</strong>
              </Card>
              <Card className="metric-card">
                <span>Groups</span>
                <strong>{groups?.length ?? 0}</strong>
              </Card>
              <Card className="metric-card">
                <span>Projects</span>
                <strong>{overview?.total_projects ?? projectPage?.items.length ?? 0}</strong>
              </Card>
              <Card className="metric-card">
                <span>API tokens</span>
                <strong>{apiTokens?.length ?? 0}</strong>
              </Card>
              <Card className="metric-card">
                <span>Pending invites</span>
                <strong>{overview?.total_open_invitations ?? invitations?.length ?? 0}</strong>
              </Card>
              <Card className="metric-card">
                <span>Plugins</span>
                <strong>{plugins?.length ?? 0}</strong>
              </Card>
            </div>
          ) : null}

          {section === "users" ? (
            <div className="content-grid">
              <Card>
                <div className="section-heading">
                  <h2>Members</h2>
                  <span className="section-count">{members.length}</span>
                </div>
                <div className="list-stack">
                  {members.map((member) => (
                    <div className="member-row" key={member.id}>
                      <div className="member-row-main">
                        <Avatar user={member.user} />
                        <div>
                          <strong>{member.user.name}</strong>
                          <p>{member.user.email}</p>
                        </div>
                      </div>
                      <div className="member-row-meta">
                        <Select
                          options={memberRoleOptions}
                          value={member.role}
                          disabled={member.role === "OWNER"}
                          onChange={(event) => void handleRoleChange(member.user_id, event.target.value)}
                        />
                        {member.role !== "OWNER" ? (
                          <Button
                            variant="ghost"
                            icon={<Trash2 size={14} />}
                            onClick={() => void handleRemoveMember(member.user_id)}
                            aria-label="Remove member"
                          />
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <div className="section-heading">
                  <h2>Invite member</h2>
                </div>
                <form className="form-stack" onSubmit={handleInvite}>
                  <Input
                    label="Email"
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    required
                  />
                  <Select
                    label="Role"
                    options={ROLE_OPTIONS}
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value)}
                  />
                  <Button type="submit" icon={<Send size={16} />}>
                    Send invite
                  </Button>
                </form>
                <div className="section-heading section-heading-spaced">
                  <h2>Pending invitations</h2>
                </div>
                <div className="list-stack">
                  {invitations?.filter((inv) => inv.status === "PENDING").length ? (
                    invitations
                      .filter((inv) => inv.status === "PENDING")
                      .map((invitation) => (
                        <div className="list-row" key={invitation.id}>
                          <div>
                            <strong>{invitation.email}</strong>
                            <p>{invitation.role}</p>
                          </div>
                          <div className="button-row">
                            <Button
                              variant="secondary"
                              icon={<RefreshCw size={14} />}
                              onClick={() => void handleResendInvitation(invitation.id)}
                            >
                              Resend
                            </Button>
                            <Button
                              variant="ghost"
                              icon={<Trash2 size={14} />}
                              onClick={() => void handleRevokeInvitation(invitation.id)}
                            >
                              Revoke
                            </Button>
                          </div>
                        </div>
                      ))
                  ) : (
                    <EmptyState title="No pending invites" description="Invite teammates to collaborate." />
                  )}
                </div>
              </Card>
            </div>
          ) : null}

          {section === "groups" ? (
            <Card>
              <div className="section-heading">
                <h2>Groups</h2>
                <span className="section-count">{groups?.length ?? 0}</span>
              </div>
              <form className="inline-form" onSubmit={handleCreateGroup}>
                <Input
                  label="Group name"
                  value={newGroupName}
                  onChange={(event) => setNewGroupName(event.target.value)}
                  placeholder="e.g. Engineering"
                />
                <Button type="submit" icon={<Plus size={16} />}>
                  Add
                </Button>
              </form>
              <div className="list-stack">
                {groups?.length ? (
                  groups.map((group) => {
                    const groupMembers = members.filter((member) => group.member_ids.includes(member.user_id));
                    const availableMembers = members.filter(
                      (member) => !group.member_ids.includes(member.user_id)
                    );
                    return (
                      <div className="list-row list-row-stack" key={group.id}>
                        <div className="list-row">
                          <div>
                            <strong>{group.name}</strong>
                            <p>{group.member_ids.length} members</p>
                          </div>
                          <div className="button-row">
                            <Button
                              variant="secondary"
                              onClick={() =>
                                setExpandedGroupId(expandedGroupId === group.id ? null : group.id)
                              }
                            >
                              {expandedGroupId === group.id ? "Hide members" : "Manage members"}
                            </Button>
                            <Button
                              variant="ghost"
                              icon={<Trash2 size={14} />}
                              onClick={() => void handleDeleteGroup(group.id)}
                              aria-label="Remove group"
                            />
                          </div>
                        </div>
                        {expandedGroupId === group.id ? (
                          <div className="form-stack" style={{ marginTop: 12 }}>
                            <div className="list-stack list-stack-compact">
                              {groupMembers.length ? (
                                groupMembers.map((member) => (
                                  <div className="list-row list-row-compact" key={member.id}>
                                    <div>
                                      <strong>{member.user.name}</strong>
                                      <p>{member.user.email}</p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      icon={<Trash2 size={14} />}
                                      onClick={() => void handleRemoveGroupMember(group.id, member.user_id)}
                                      aria-label="Remove from group"
                                    />
                                  </div>
                                ))
                              ) : (
                                <p className="muted-copy">No members in this group yet.</p>
                              )}
                            </div>
                            {availableMembers.length ? (
                              <div className="inline-form">
                                <Select
                                  label="Add member"
                                  options={[
                                    { label: "Select member", value: "" },
                                    ...availableMembers.map((member) => ({
                                      label: member.user.name,
                                      value: member.user_id
                                    }))
                                  ]}
                                  value={groupMemberPick[group.id] ?? ""}
                                  onChange={(event) =>
                                    setGroupMemberPick((prev) => ({
                                      ...prev,
                                      [group.id]: event.target.value
                                    }))
                                  }
                                />
                                <Button
                                  type="button"
                                  onClick={() => void handleAddGroupMember(group.id)}
                                  disabled={!groupMemberPick[group.id]}
                                >
                                  Add
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <EmptyState title="No groups yet" description="Groups make it easy to manage access for teams." />
                )}
              </div>
            </Card>
          ) : null}

          {section === "permissions" ? (
            <div className="content-grid">
              <Card>
                <div className="section-heading">
                  <h2>Permission scheme</h2>
                </div>
                <div className="form-stack">
                  <Select
                    label="Project"
                    options={[{ label: "Select a project", value: "" }, ...projectOptions]}
                    value={selectedProjectId}
                    onChange={(event) => setSelectedProjectId(event.target.value)}
                  />
                  <div className="button-row">
                    <Button variant="secondary" onClick={() => void handleLoadScheme()} disabled={!selectedProjectId}>
                      Load scheme
                    </Button>
                    <Button onClick={() => void handleCreateScheme()} disabled={!selectedProjectId}>
                      Ensure scheme
                    </Button>
                  </div>
                </div>
                {permissionScheme ? (
                  <div className="list-stack list-stack-compact" style={{ marginTop: 16 }}>
                    <div className="list-row list-row-compact">
                      <div>
                        <strong>{permissionScheme.name}</strong>
                        <p>{permissionScheme.grants.length} grants</p>
                      </div>
                    </div>
                    {permissionScheme.grants.map((grant) => (
                      <div className="list-row list-row-compact" key={grant.id}>
                        <div>
                          <strong>{grant.permission}</strong>
                          <p>
                            {grant.holder_type}
                            {grant.holder_role ? ` · ${grant.holder_role}` : ""}
                            {grant.holder_id
                              ? ` · ${groups?.find((g) => g.id === grant.holder_id)?.name ?? grant.holder_id}`
                              : ""}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          icon={<Trash2 size={14} />}
                          onClick={() => void handleDeleteGrant(grant.id)}
                          aria-label="Delete grant"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted-copy" style={{ marginTop: 12 }}>
                    Select a project to view or create its permission scheme.
                  </p>
                )}
              </Card>
              <Card>
                <div className="section-heading">
                  <h2>Add grant</h2>
                </div>
                <form className="form-stack" onSubmit={handleAddGrant}>
                  <Select
                    label="Holder type"
                    options={[
                      { label: "Workspace role", value: "WORKSPACE_ROLE" },
                      { label: "Group", value: "GROUP" }
                    ]}
                    value={grantHolderType}
                    onChange={(event) =>
                      setGrantHolderType(event.target.value as "WORKSPACE_ROLE" | "GROUP")
                    }
                  />
                  <Select
                    label="Permission"
                    options={PERMISSION_OPTIONS}
                    value={grantPermission}
                    onChange={(event) => setGrantPermission(event.target.value)}
                  />
                  {grantHolderType === "WORKSPACE_ROLE" ? (
                    <Select
                      label="Workspace role"
                      options={ROLE_OPTIONS}
                      value={grantRole}
                      onChange={(event) => setGrantRole(event.target.value)}
                    />
                  ) : (
                    <Select
                      label="Group"
                      options={[{ label: "Select group", value: "" }, ...groupOptions]}
                      value={grantGroupId}
                      onChange={(event) => setGrantGroupId(event.target.value)}
                    />
                  )}
                  <Button type="submit" disabled={!selectedProjectId}>
                    Add grant
                  </Button>
                </form>
              </Card>
            </div>
          ) : null}

          {section === "projects" ? (
            <Card>
              <div className="section-heading">
                <h2>Projects</h2>
                <span className="section-count">{projectPage?.items.length ?? 0}</span>
              </div>
              <div className="list-stack">
                {projectPage?.items.length ? (
                  projectPage.items.map((project) => (
                    <div className="list-row" key={project.id}>
                      <div>
                        <strong>{project.name}</strong>
                        <p>{project.key}</p>
                      </div>
                      <div className="button-row">
                        <Link to={`/projects/${project.id}?tab=settings`}>
                          <Button variant="secondary" icon={<ExternalLink size={14} />}>
                            Settings
                          </Button>
                        </Link>
                        <Link to={`/projects/${project.id}/board-settings`}>
                          <Button variant="secondary">Board</Button>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No projects" description="Create a project from the workspace dashboard." />
                )}
              </div>
            </Card>
          ) : null}

          {section === "issues" ? (
            <div className="content-grid">
              <Card>
                <div className="section-heading">
                  <h2>Issue type schemes</h2>
                  <span className="section-count">{issueTypeSchemes?.length ?? 0}</span>
                </div>
                <form className="form-stack" onSubmit={handleCreateIssueTypeScheme}>
                  <Input
                    label="Scheme name"
                    value={newSchemeName}
                    onChange={(event) => setNewSchemeName(event.target.value)}
                    placeholder="e.g. Software delivery"
                    required
                  />
                  <fieldset className="checkbox-group">
                    <legend>Work item types</legend>
                    {ISSUE_TYPE_OPTIONS.map((type) => (
                      <label className="checkbox-field" key={type}>
                        <input
                          type="checkbox"
                          checked={newSchemeTypes.includes(type)}
                          onChange={() => toggleSchemeType(type)}
                        />
                        <span>{type}</span>
                      </label>
                    ))}
                  </fieldset>
                  <Button type="submit" icon={<Plus size={16} />}>
                    Create scheme
                  </Button>
                </form>
                <div className="list-stack" style={{ marginTop: 16 }}>
                  {issueTypeSchemes?.length ? (
                    issueTypeSchemes.map((scheme: IssueTypeScheme) => (
                      <div className="list-row" key={scheme.id}>
                        <div>
                          <strong>{scheme.name}</strong>
                          <p>{scheme.items.map((item) => item.work_item_type).join(", ")}</p>
                        </div>
                        <Button
                          variant="ghost"
                          icon={<Trash2 size={14} />}
                          onClick={() => void handleDeleteIssueTypeScheme(scheme.id)}
                          aria-label="Delete scheme"
                        />
                      </div>
                    ))
                  ) : (
                    <EmptyState title="No schemes" description="Create a scheme to define allowed work item types." />
                  )}
                </div>
              </Card>
              <Card>
                <div className="section-heading">
                  <h2>Assign to project</h2>
                </div>
                <form className="form-stack" onSubmit={handleAssignIssueTypeScheme}>
                  <Select
                    label="Project"
                    options={[{ label: "Select a project", value: "" }, ...projectOptions]}
                    value={assignSchemeProjectId}
                    onChange={(event) => setAssignSchemeProjectId(event.target.value)}
                  />
                  <Select
                    label="Issue type scheme"
                    options={[{ label: "None (clear)", value: "" }, ...schemeOptions]}
                    value={assignSchemeId}
                    onChange={(event) => setAssignSchemeId(event.target.value)}
                  />
                  <Button type="submit" disabled={!assignSchemeProjectId}>
                    Assign scheme
                  </Button>
                </form>
                {assignSchemeProjectId ? (
                  <Link to={`/projects/${assignSchemeProjectId}?tab=fields`} style={{ marginTop: 16, display: "inline-block" }}>
                    <Button variant="secondary" icon={<ExternalLink size={16} />}>
                      Open field configuration
                    </Button>
                  </Link>
                ) : null}
              </Card>
            </div>
          ) : null}

          {section === "workflows" ? (
            <div className="content-grid">
              <Card>
                <div className="section-heading">
                  <h2>Workflow designer</h2>
                </div>
                <Select
                  label="Project"
                  options={[{ label: "Select a project", value: "" }, ...projectOptions]}
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                />
                <div className="section-heading section-heading-spaced">
                  <h3>Statuses</h3>
                </div>
                <form className="inline-form" onSubmit={handleCreateStatus}>
                  <Input
                    label="Name"
                    value={newStatusName}
                    onChange={(event) => setNewStatusName(event.target.value)}
                    placeholder="In QA"
                  />
                  <Input
                    label="Key"
                    value={newStatusKey}
                    onChange={(event) => setNewStatusKey(event.target.value)}
                    placeholder="IN_QA"
                  />
                  <Button type="submit" disabled={!selectedProjectId} icon={<Plus size={16} />}>
                    Add status
                  </Button>
                </form>
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {workflowStatuses.length ? (
                    workflowStatuses.map((status) => (
                      <div className="list-row list-row-compact" key={status.id}>
                        <div>
                          <strong>{status.name}</strong>
                          <p>{status.key}</p>
                        </div>
                        <div className="button-row">
                          <Button variant="secondary" onClick={() => void handleRenameStatus(status)}>
                            Rename
                          </Button>
                          <Button
                            variant="ghost"
                            icon={<Trash2 size={14} />}
                            onClick={() => void handleDeleteStatus(status.id)}
                            aria-label="Delete status"
                            disabled={status.is_default}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState title="No statuses" description="Select a project to load its workflow statuses." />
                  )}
                </div>
                <div className="section-heading section-heading-spaced">
                  <h3>Transitions</h3>
                </div>
                <form className="form-stack" onSubmit={handleCreateTransition}>
                  <Select
                    label="From status"
                    options={[{ label: "Select status", value: "" }, ...statusOptions]}
                    value={transitionFrom}
                    onChange={(event) => setTransitionFrom(event.target.value)}
                  />
                  <Select
                    label="To status"
                    options={[{ label: "Select status", value: "" }, ...statusOptions]}
                    value={transitionTo}
                    onChange={(event) => setTransitionTo(event.target.value)}
                  />
                  <Input
                    label="Transition name"
                    value={transitionName}
                    onChange={(event) => setTransitionName(event.target.value)}
                    placeholder="e.g. Start progress"
                  />
                  <Button type="submit" disabled={!selectedProjectId || !transitionFrom || !transitionTo}>
                    Add transition
                  </Button>
                </form>
                <div className="list-stack" style={{ marginTop: 16 }}>
                  {transitions.length ? (
                    transitions.map((transition) => (
                      <div
                        className={`list-row list-row-compact ${selectedTransitionId === transition.id ? "is-selected" : ""}`}
                        key={transition.id}
                      >
                        <button
                          type="button"
                          className="list-row-button"
                          onClick={() => setSelectedTransitionId(transition.id)}
                        >
                          <strong>{transition.name || "Transition"}</strong>
                          <p>
                            {statusLabelById.get(transition.from_status_id) ?? transition.from_status_id} →{" "}
                            {statusLabelById.get(transition.to_status_id) ?? transition.to_status_id}
                          </p>
                        </button>
                        <Button
                          variant="ghost"
                          icon={<Trash2 size={14} />}
                          onClick={() => void handleDeleteTransition(transition.id)}
                          aria-label="Delete transition"
                        />
                      </div>
                    ))
                  ) : (
                    <EmptyState title="No transitions" description="Add transitions for the selected project." />
                  )}
                </div>
                {selectedProjectId ? (
                  <Link to={`/projects/${selectedProjectId}/board-settings`} style={{ marginTop: 16, display: "inline-block" }}>
                    <Button variant="secondary" icon={<ExternalLink size={16} />}>
                      Open board settings
                    </Button>
                  </Link>
                ) : null}
              </Card>
              <Card>
                <div className="section-heading">
                  <h2>Transition rules</h2>
                </div>
                {!selectedTransitionId ? (
                  <p className="muted-copy">Select a transition to manage its rules.</p>
                ) : (
                  <>
                    <div className="list-stack list-stack-compact">
                      {transitionRules.length ? (
                        transitionRules.map((rule) => (
                          <div className="list-row list-row-compact" key={rule.id}>
                            <div>
                              <strong>
                                {rule.kind} · {rule.rule_type}
                              </strong>
                              <p>{JSON.stringify(rule.config)}</p>
                            </div>
                            <Button
                              variant="ghost"
                              icon={<Trash2 size={14} />}
                              onClick={() => void handleDeleteRule(rule.id)}
                              aria-label="Delete rule"
                            />
                          </div>
                        ))
                      ) : (
                        <EmptyState title="No rules" description="Add conditions, validators, or post functions." />
                      )}
                    </div>
                    <form className="form-stack" style={{ marginTop: 16 }} onSubmit={handleCreateRule}>
                      <Select
                        label="Kind"
                        options={RULE_KINDS.map((item) => ({ label: item.label, value: item.value }))}
                        value={ruleKind}
                        onChange={(event) => setRuleKind(event.target.value)}
                      />
                      <Select
                        label="Rule type"
                        options={RULE_TYPES[ruleKind] ?? []}
                        value={ruleType}
                        onChange={(event) => setRuleType(event.target.value)}
                      />
                      <Input
                        label="Role (config)"
                        value={ruleConfigRole}
                        onChange={(event) => setRuleConfigRole(event.target.value)}
                        placeholder="MEMBER"
                      />
                      <Input
                        label="Field (config)"
                        value={ruleConfigField}
                        onChange={(event) => setRuleConfigField(event.target.value)}
                        placeholder="status"
                      />
                      <Input
                        label="Value (config)"
                        value={ruleConfigValue}
                        onChange={(event) => setRuleConfigValue(event.target.value)}
                        placeholder="DONE"
                      />
                      <label className="field" htmlFor="rule-config-json">
                        <span>Config JSON (optional override)</span>
                        <textarea
                          id="rule-config-json"
                          value={ruleConfigJson}
                          onChange={(event) => setRuleConfigJson(event.target.value)}
                          rows={3}
                        />
                      </label>
                      <Button type="submit">Add rule</Button>
                    </form>
                  </>
                )}
              </Card>
            </div>
          ) : null}

          {section === "apps" ? (
            <div className="content-grid">
              <Card>
                <div className="section-heading">
                  <h2>Installed plugins</h2>
                  <span className="section-count">{plugins?.length ?? 0}</span>
                </div>
                <form className="inline-form" onSubmit={handleInstallPlugin}>
                  <Input
                    label="Plugin name"
                    value={pluginName}
                    onChange={(event) => setPluginName(event.target.value)}
                    placeholder="e.g. Time sync"
                  />
                  <Button type="submit" icon={<Plus size={16} />}>
                    Install
                  </Button>
                </form>
                <div className="list-stack">
                  {plugins?.length ? (
                    plugins.map((plugin) => (
                      <div className="list-row" key={plugin.id}>
                        <div>
                          <strong>{plugin.name}</strong>
                          <p>{plugin.enabled ? "Enabled" : "Disabled"}</p>
                        </div>
                        <div className="button-row">
                          <label className="checkbox-field">
                            <input
                              type="checkbox"
                              checked={plugin.enabled}
                              onChange={(event) => void handleTogglePlugin(plugin.id, event.target.checked)}
                            />
                            <span>Enabled</span>
                          </label>
                          <Button
                            variant="ghost"
                            icon={<Trash2 size={14} />}
                            onClick={() => void handleUninstallPlugin(plugin.id)}
                            aria-label="Uninstall plugin"
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState title="No plugins" description="Install a plugin to extend workspace capabilities." />
                  )}
                </div>
                <Button variant="secondary" style={{ marginTop: 12 }} onClick={() => goToSection("marketplace")}>
                  Browse marketplace
                </Button>
              </Card>
              <Card>
                <div className="section-heading">
                  <h2>Slack</h2>
                </div>
                <form className="form-stack" onSubmit={handleSaveSlack}>
                  <Input
                    label="Webhook URL"
                    value={slackWebhook}
                    onChange={(event) => setSlackWebhook(event.target.value)}
                    placeholder="https://hooks.slack.com/..."
                  />
                  <Input
                    label="Default channel"
                    value={slackChannel}
                    onChange={(event) => setSlackChannel(event.target.value)}
                    placeholder="#workboard"
                  />
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={slackEnabled}
                      onChange={(event) => setSlackEnabled(event.target.checked)}
                    />
                    <span>Enable Slack notifications</span>
                  </label>
                  <Button type="submit">Save Slack settings</Button>
                </form>
              </Card>
            </div>
          ) : null}

          {section === "marketplace" ? (
            <Card>
              <div className="section-heading">
                <h2>Marketplace</h2>
                <span className="section-count">{marketplaceCatalog?.length ?? 0}</span>
              </div>
              <div className="list-stack">
                {marketplaceCatalog?.length ? (
                  marketplaceCatalog.map((item) => (
                    <div className="list-row" key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        <p>
                          {item.description} · v{item.version}
                        </p>
                      </div>
                      <Button onClick={() => void handleInstallMarketplace(item.id)}>Install</Button>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No marketplace apps" description="Check back later for new integrations." />
                )}
              </div>
              <Button variant="secondary" style={{ marginTop: 16 }} onClick={() => goToSection("apps")}>
                View installed apps
              </Button>
            </Card>
          ) : null}

          {section === "email" ? (
            <div className="content-grid">
              <Card>
                <div className="section-heading">
                  <h2>SMTP settings</h2>
                </div>
                <form className="form-stack" onSubmit={handleSaveSmtp}>
                  <Input
                    label="Host"
                    value={smtpHost}
                    onChange={(event) => setSmtpHost(event.target.value)}
                    placeholder="smtp.example.com"
                  />
                  <Input
                    label="Port"
                    type="number"
                    value={smtpPort}
                    onChange={(event) => setSmtpPort(event.target.value)}
                  />
                  <Input
                    label="Username"
                    value={smtpUsername}
                    onChange={(event) => setSmtpUsername(event.target.value)}
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={smtpPassword}
                    onChange={(event) => setSmtpPassword(event.target.value)}
                    placeholder={smtpSettings?.password_set ? "•••••••• (unchanged if blank)" : "Enter password"}
                  />
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={smtpUseTls}
                      onChange={(event) => setSmtpUseTls(event.target.checked)}
                    />
                    <span>Use TLS</span>
                  </label>
                  <Input
                    label="From email"
                    type="email"
                    value={smtpFromEmail}
                    onChange={(event) => setSmtpFromEmail(event.target.value)}
                  />
                  <Input
                    label="From name"
                    value={smtpFromName}
                    onChange={(event) => setSmtpFromName(event.target.value)}
                  />
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={smtpEnabled}
                      onChange={(event) => setSmtpEnabled(event.target.checked)}
                    />
                    <span>Enable outbound email</span>
                  </label>
                  <div className="button-row">
                    <Button type="submit">Save SMTP</Button>
                    <Button type="button" variant="secondary" onClick={() => void handleTestSmtp()}>
                      Test connection
                    </Button>
                  </div>
                </form>
              </Card>
              <Card>
                <div className="section-heading">
                  <h2>Email templates</h2>
                </div>
                <form className="form-stack" onSubmit={handleSaveTemplates}>
                  {templateDrafts.length ? (
                    templateDrafts.map((template, index) => (
                      <div className="template-editor" key={template.key}>
                        <strong>{template.name}</strong>
                        <Input
                          label="Subject"
                          value={template.subject}
                          onChange={(event) => updateTemplateDraft(index, { subject: event.target.value })}
                        />
                        <label className="field" htmlFor={`template-html-${template.key}`}>
                          <span>Body (HTML)</span>
                          <textarea
                            id={`template-html-${template.key}`}
                            value={template.body_html}
                            onChange={(event) => updateTemplateDraft(index, { body_html: event.target.value })}
                            rows={4}
                          />
                        </label>
                        <label className="field" htmlFor={`template-text-${template.key}`}>
                          <span>Body (plain text)</span>
                          <textarea
                            id={`template-text-${template.key}`}
                            value={template.body_text}
                            onChange={(event) => updateTemplateDraft(index, { body_text: event.target.value })}
                            rows={3}
                          />
                        </label>
                      </div>
                    ))
                  ) : (
                    <EmptyState title="No templates" description="Default templates appear after SMTP is configured." />
                  )}
                  {templateDrafts.length ? (
                    <Button type="submit">Save all templates</Button>
                  ) : null}
                </form>
              </Card>
            </div>
          ) : null}

          {section === "domains" ? (
            <div className="content-grid">
              <Card>
                <div className="section-heading">
                  <h2>Custom domains</h2>
                  <span className="section-count">{domains?.length ?? 0}</span>
                </div>
                <form className="inline-form" onSubmit={handleAddDomain}>
                  <Input
                    label="Domain"
                    value={newDomain}
                    onChange={(event) => setNewDomain(event.target.value)}
                    placeholder="app.example.com"
                  />
                  <Button type="submit" icon={<Plus size={16} />}>
                    Add
                  </Button>
                </form>
                <div className="list-stack">
                  {domains?.length ? (
                    domains.map((domain) => (
                      <div className="list-row list-row-stack" key={domain.id}>
                        <div className="list-row">
                          <div>
                            <strong>{domain.domain}</strong>
                            <p>{domain.verified ? "Verified" : "Pending verification"}</p>
                          </div>
                          <div className="button-row">
                            {!domain.verified ? (
                              <Button variant="secondary" onClick={() => void handleVerifyDomain(domain.id)}>
                                Verify
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              icon={<Trash2 size={14} />}
                              onClick={() => void handleDeleteDomain(domain.id)}
                              aria-label="Delete domain"
                            />
                          </div>
                        </div>
                        <p className="muted-copy">
                          Token: <code>{domain.verification_token}</code>
                          {domain.txt_record_name ? (
                            <>
                              {" "}
                              · TXT record: <code>{domain.txt_record_name}</code>
                            </>
                          ) : null}
                        </p>
                      </div>
                    ))
                  ) : (
                    <EmptyState title="No domains" description="Add a custom domain for branded access." />
                  )}
                </div>
              </Card>
              <Card>
                <div className="section-heading">
                  <h2>DNS provider</h2>
                </div>
                <form className="form-stack" onSubmit={handleSaveDns}>
                  <Select
                    label="Provider"
                    options={[
                      { label: "Mock", value: "mock" },
                      { label: "Cloudflare", value: "cloudflare" }
                    ]}
                    value={dnsProviderName}
                    onChange={(event) => setDnsProviderName(event.target.value)}
                  />
                  <Input
                    label="API token"
                    type="password"
                    value={dnsApiToken}
                    onChange={(event) => setDnsApiToken(event.target.value)}
                    placeholder={dnsProvider?.api_token_set ? "•••••••• (unchanged if blank)" : "Enter API token"}
                  />
                  <Input
                    label="Zone ID"
                    value={dnsZoneId}
                    onChange={(event) => setDnsZoneId(event.target.value)}
                  />
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={dnsEnabled}
                      onChange={(event) => setDnsEnabled(event.target.checked)}
                    />
                    <span>Enable DNS automation</span>
                  </label>
                  <Button type="submit">Save DNS provider</Button>
                </form>
              </Card>
            </div>
          ) : null}

          {section === "branding" ? (
            <Card>
              <div className="section-heading">
                <h2>Branding</h2>
              </div>
              <p className="muted-copy">Workspace chrome updates after you save branding changes.</p>
              <form className="form-stack" style={{ marginTop: 16, maxWidth: 480 }} onSubmit={handleBrandingUpdate}>
                <Input
                  label="Logo URL"
                  value={logoUrl}
                  onChange={(event) => setLogoUrl(event.target.value)}
                  placeholder="https://cdn.example.com/logo.png"
                />
                <label className="field" htmlFor="accent-color">
                  <span>Accent color</span>
                  <input
                    id="accent-color"
                    type="color"
                    value={accentColor}
                    onChange={(event) => setAccentColor(event.target.value)}
                  />
                </label>
                <Input
                  label="Brand name"
                  value={brandName}
                  onChange={(event) => setBrandName(event.target.value)}
                  placeholder={workspace.name}
                />
                <Input
                  label="Brand tagline"
                  value={brandTagline}
                  onChange={(event) => setBrandTagline(event.target.value)}
                  placeholder="Ship work with clarity"
                />
                <Button type="submit">Save branding</Button>
              </form>
            </Card>
          ) : null}

          {section === "security" ? (
            <div className="admin-section-stack">
              <div className="admin-security-grid">
                <Card>
                  <div className="section-heading">
                    <h2>SSO configuration</h2>
                  </div>
                  <form className="form-stack" onSubmit={handleSaveSso}>
                    <Select
                      label="Provider"
                      options={[
                        { label: "OIDC", value: "oidc" },
                        { label: "SAML", value: "saml" }
                      ]}
                      value={ssoProvider}
                      onChange={(event) => setSsoProvider(event.target.value)}
                    />
                    {ssoProvider === "oidc" ? (
                      <>
                        <Input
                          label="Client ID"
                          value={ssoClientId}
                          onChange={(event) => setSsoClientId(event.target.value)}
                          placeholder="your-client-id"
                        />
                        <Input
                          label="Client secret"
                          type="password"
                          value={ssoClientSecret}
                          onChange={(event) => setSsoClientSecret(event.target.value)}
                          placeholder="Leave blank to keep existing"
                        />
                        <Input
                          label="Issuer"
                          value={ssoIssuer}
                          onChange={(event) => setSsoIssuer(event.target.value)}
                          placeholder="https://idp.example.com"
                        />
                      </>
                    ) : (
                      <>
                        <Input
                          label="IdP entity ID"
                          value={ssoIdpEntityId}
                          onChange={(event) => setSsoIdpEntityId(event.target.value)}
                        />
                        <Input
                          label="IdP SSO URL"
                          value={ssoIdpSsoUrl}
                          onChange={(event) => setSsoIdpSsoUrl(event.target.value)}
                          placeholder="https://idp.example.com/sso"
                        />
                        <label className="field" htmlFor="sso-idp-cert">
                          <span>IdP X.509 certificate</span>
                          <textarea
                            id="sso-idp-cert"
                            value={ssoIdpX509Cert}
                            onChange={(event) => setSsoIdpX509Cert(event.target.value)}
                            rows={4}
                          />
                        </label>
                        <Input
                          label="SP entity ID"
                          value={ssoSpEntityId}
                          onChange={(event) => setSsoSpEntityId(event.target.value)}
                        />
                        <div className="admin-url-panel">
                          <div>
                            <span>Metadata URL</span>
                            <code>{samlMetadataUrl}</code>
                          </div>
                          <div>
                            <span>ACS URL</span>
                            <code>{samlAcsUrl}</code>
                          </div>
                        </div>
                      </>
                    )}
                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={ssoEnabled}
                        onChange={(event) => setSsoEnabled(event.target.checked)}
                      />
                      <span>Enforce SSO for this workspace</span>
                    </label>
                    <div className="button-row">
                      <Button type="submit">Save SSO settings</Button>
                      <Button type="button" variant="secondary" onClick={() => void handleValidateSso()}>
                        Validate
                      </Button>
                    </div>
                  </form>
                </Card>

                <div className="admin-section-stack">
                  <Card>
                    <div className="section-heading">
                      <h2>API tokens</h2>
                      <span className="section-count">{apiTokens?.length ?? 0}</span>
                    </div>
                    <form className="inline-form" onSubmit={handleCreateToken}>
                      <Input
                        label="Token name"
                        value={newTokenName}
                        onChange={(event) => setNewTokenName(event.target.value)}
                        placeholder="e.g. CI pipeline"
                      />
                      <Button type="submit" icon={<Plus size={16} />}>
                        Create
                      </Button>
                    </form>
                    {createdTokenSecret ? (
                      <div className="error-banner token-reveal">
                        Copy this token now — it won&apos;t be shown again: <code>{createdTokenSecret}</code>
                      </div>
                    ) : null}
                    <div className="list-stack">
                      {apiTokens?.length ? (
                        apiTokens.map((token) => (
                          <div className="list-row" key={token.id}>
                            <div>
                              <strong>{token.name}</strong>
                              <p>{token.token_prefix}…</p>
                            </div>
                            <Button
                              variant="ghost"
                              icon={<Trash2 size={14} />}
                              onClick={() => void handleRevokeToken(token.id)}
                              aria-label="Revoke token"
                            />
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          title="No API tokens"
                          description="Create a token to authenticate automation and integrations."
                        />
                      )}
                    </div>
                  </Card>
                  <Card>
                    <div className="section-heading">
                      <h2>Data export</h2>
                    </div>
                    <p className="muted-copy">Download a GDPR-compliant export of your account data.</p>
                    <Button variant="secondary" icon={<Download size={16} />} onClick={() => void handleGdprExport()}>
                      Download GDPR export
                    </Button>
                  </Card>
                </div>
              </div>
            </div>
          ) : null}

          {section === "general" ? (
            <div className="content-grid">
              <Card>
                <div className="section-heading">
                  <h2>General settings</h2>
                </div>
                <form className="form-stack" onSubmit={handleWorkspaceUpdate}>
                  <Input
                    label="Name"
                    value={workspaceName}
                    onChange={(event) => setWorkspaceName(event.target.value)}
                    required
                  />
                  <Input
                    label="Slug"
                    value={workspaceSlug}
                    onChange={(event) => setWorkspaceSlug(event.target.value)}
                    required
                  />
                  <label className="field" htmlFor="admin-workspace-description">
                    <span>Description</span>
                    <textarea
                      id="admin-workspace-description"
                      value={workspaceDescription}
                      onChange={(event) => setWorkspaceDescription(event.target.value)}
                    />
                  </label>
                  <Select
                    label="Visibility"
                    options={[
                      { label: "Private", value: "PRIVATE" },
                      { label: "Public", value: "PUBLIC" }
                    ]}
                    value={workspaceVisibility}
                    onChange={(event) => setWorkspaceVisibility(event.target.value as "PRIVATE" | "PUBLIC")}
                  />
                  <Button type="submit">Save changes</Button>
                </form>
              </Card>
              {renderDeleteWorkspaceCard()}
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete workspace?"
        description="This action cannot be undone."
        confirmLabel="Delete workspace"
        onConfirm={handleDeleteWorkspace}
        onClose={() => setIsDeleteOpen(false)}
      />
    </div>
  );
}
