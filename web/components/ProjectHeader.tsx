/**
 * Project Header Component
 * Displays project name, status, and basic info
 */

import React from "react";
import { ProjectData } from "../lib/api";

interface ProjectHeaderProps {
  project: ProjectData;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({ project }) => {
  const statusBadgeClass = `status-badge status-${project.status}`;

  return (
    <header className="project-header">
      <div className="header-content">
        <div className="header-title">
          <h1>{project.name}</h1>
          <span className={statusBadgeClass}>
            {project.status === "active" && "🟢 Active"}
            {project.status === "completed" && "✅ Completed"}
            {project.status === "on_hold" && "⏸️ On Hold"}
          </span>
        </div>

        {project.description && (
          <p className="header-description">{project.description}</p>
        )}
      </div>

      <div className="header-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </div>
    </header>
  );
};

export default ProjectHeader;
