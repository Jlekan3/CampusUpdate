import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import CustomButton from '../../components/CustomButton';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { USER_ROLES } from '../../utils/constants';
import { deleteItem, subscribeToUsers, createUserWithAuthAndFirestore, updateItem } from '../../services/databaseService';

const ManagePeopleScreen = ({ navigation }) => {
  const [people, setPeople] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditingPerson, setIsEditingPerson] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState(null);
  const [userType, setUserType] = useState('student');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    studentID: '',
    programme: '',
    level: '100',
    department: '',
  });
  const { userRole } = useAuth();
  const peopleCount = people.length;

  const filteredPeople = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return people;

    return people.filter((item) => {
      const fields = [
        item.name,
        item.email,
        item.role,
        item.studentID,
        item.studentId,
        item.programme,
        item.department,
        item.level,
      ]
        .map((value) => (value || '').toString().toLowerCase());

      return fields.some((value) => value.includes(query));
    });
  }, [people, searchQuery]);

  const openCreateModal = () => {
    setIsEditingPerson(false);
    setEditingPersonId(null);
    setUserType('student');
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'student',
      studentID: '',
      programme: '',
      level: '100',
      department: '',
    });
    setShowModal(true);
  };

  const openEditModal = (person) => {
    const nextUserType = person.role === 'staff' ? 'staff' : 'student';

    setIsEditingPerson(true);
    setEditingPersonId(person.id);
    setUserType(nextUserType);
    setFormData({
      name: person.name || '',
      email: person.email || '',
      password: '',
      role: nextUserType,
      studentID: person.studentID || person.studentId || '',
      programme: person.programme || '',
      level: person.level ? String(person.level) : '100',
      department: person.department || '',
    });
    setShowModal(true);
  };

  // Subscribe to real-time user updates from Firebase
  React.useEffect(() => {
    console.log('ManagePeopleScreen: Setting up real-time subscription to users collection');
    
    const unsubscribe = subscribeToUsers((users) => {
      console.log('ManagePeopleScreen: Users updated from Firebase:', users.length, 'users');
      // Filter to only show student and staff (not admin)
      const filteredUsers = users.filter(u => u.role === 'student' || u.role === 'staff');
      setPeople(filteredUsers);
    });

    return () => {
      console.log('ManagePeopleScreen: Cleaning up subscription');
      unsubscribe();
    };
  }, []);

  const handleSavePerson = async () => {
    const actionLabel = isEditingPerson ? 'handleSavePerson(edit)' : 'handleSavePerson(create)';
    console.log(`🔵 ${actionLabel}: Button clicked`);
    console.log('User role:', userRole);
    console.log('USER_ROLES.ADMIN:', USER_ROLES.ADMIN);
    
    if (userRole !== USER_ROLES.ADMIN) {
      console.warn('handleAddPerson: User is not admin');
      return Alert.alert('Unauthorized', 'You are not allowed to perform this action');
    }

    // Validation
    console.log(`${actionLabel}: Starting validation...`);
    console.log('Form data:', JSON.stringify(formData, null, 2));
    console.log('User type:', userType);
    
    if (!formData.name.trim() || !formData.email.trim()) {
      console.warn('handleAddPerson: Name or email missing');
      return Alert.alert('Validation Error', 'Name and Email are required');
    }

    if (!isEditingPerson && (!formData.password.trim() || formData.password.length < 6)) {
      console.warn(`${actionLabel}: Password validation failed`);
      return Alert.alert('Validation Error', 'Password must be at least 6 characters long');
    }

    if (userType === 'student') {
      if (!formData.studentID.trim()) {
        console.warn(`${actionLabel}: Student ID missing`);
        return Alert.alert('Validation Error', 'Student ID is required for students');
      }
      if (!formData.programme.trim()) {
          console.warn(`${actionLabel}: Programme missing`);
        return Alert.alert('Validation Error', 'Programme is required for students');
      }
    }

    if (userType === 'staff' && !formData.department.trim()) {
      console.warn(`${actionLabel}: Department missing`);
      return Alert.alert('Validation Error', 'Department is required for staff');
    }

    console.log(`✓ ${actionLabel}: All validations passed`);

    try {
      // Prepare data WITHOUT password (password is managed separately by Firebase Auth)
      const userData = {
        name: formData.name,
        role: userType,
        email: formData.email,
      };

      // Add student-specific fields
      if (userType === 'student') {
        userData.studentID = formData.studentID;
        userData.programme = formData.programme;
        userData.level = parseInt(formData.level);
        userData.department = '';
      }

      // Add staff-specific fields
      if (userType === 'staff') {
        userData.department = formData.department;
        userData.studentID = '';
        userData.programme = '';
        userData.level = '';
      }

      if (isEditingPerson) {
        console.log(`→ ${actionLabel}: Updating Firestore document for user ID:`, editingPersonId);
        await updateItem('users', editingPersonId, userData);
        console.log(`✓ ${actionLabel}: Successfully updated user`);
      } else {
        console.log(`→ ${actionLabel}: Calling createUserWithAuthAndFirestore`);
        console.log('Email:', formData.email);
        console.log('User data:', JSON.stringify(userData, null, 2));

        // Create user with Firebase Auth (email/password) + Firestore document
        // Returns UID which is used as document ID
        const uid = await createUserWithAuthAndFirestore(
          formData.email,
          formData.password,
          userData
        );

        console.log(`✓ ${actionLabel}: Successfully created user with UID:`, uid);
      }

      // Close modal and reset form
      setShowModal(false);
      setIsEditingPerson(false);
      setEditingPersonId(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: userType,
        studentID: '',
        programme: '',
        level: '100',
        department: '',
      });

      Alert.alert(
        'Success',
        isEditingPerson
          ? `${userType.charAt(0).toUpperCase() + userType.slice(1)} updated successfully`
          : `${userType.charAt(0).toUpperCase() + userType.slice(1)} created with Auth and saved to Firestore!`
      );
    } catch (error) {
      console.error(`✗ ${actionLabel}: Exception caught`);
      console.error('Error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = isEditingPerson ? 'Unable to update user' : 'Unable to create user';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete User', 'Are you sure you want to delete this user? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('ManagePeopleScreen: Deleting user with ID:', id);
            await deleteItem('users', id);
            console.log('ManagePeopleScreen: Successfully deleted user');
            Alert.alert('Success', 'User deleted successfully');
            // The real-time listener will automatically update the list
          } catch (error) {
            console.error('Error deleting user:', error);
            Alert.alert('Error', error.message || 'Unable to delete user');
          }
        },
      },
    ]);
  };

  const renderPersonCard = ({ item }) => (
    <View style={styles.personCard}>
      <View style={styles.personTopRow}>
        <View style={styles.personHeader}>
          <View
            style={[
              styles.personIcon,
              {
                backgroundColor:
                  item.role === 'student' ? '#EEF4FF' : '#F3F4F6',
              },
            ]}
          >
            <Ionicons
              name={item.role === 'student' ? 'school-outline' : 'briefcase-outline'}
              size={22}
              color={item.role === 'student' ? '#2563EB' : '#6B7280'}
            />
          </View>
          <View style={styles.personInfo}>
            <Text style={styles.personName}>{item.name}</Text>
            <Text style={styles.personRole}>
              {item.role === 'student'
                ? `Student • ${item.studentID || item.studentId || 'No ID'}`
                : `Staff • ${item.department || 'No department'}`}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => openEditModal(item)}
          style={styles.editButton}
          activeOpacity={0.85}
        >
          <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          style={styles.deleteButton}
          activeOpacity={0.85}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.personDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue}>{item.email}</Text>
        </View>

        {item.role === 'student' && (
          <View style={styles.detailGrid}>
            <View style={styles.detailChip}>
              <Text style={styles.detailChipLabel}>Student ID</Text>
              <Text style={styles.detailChipValue}>{item.studentID || item.studentId || 'N/A'}</Text>
            </View>
            <View style={styles.detailChip}>
              <Text style={styles.detailChipLabel}>Programme</Text>
              <Text style={styles.detailChipValue}>{item.programme || 'N/A'}</Text>
            </View>
            <View style={styles.detailChip}>
              <Text style={styles.detailChipLabel}>Level</Text>
              <Text style={styles.detailChipValue}>{item.level || 'N/A'}</Text>
            </View>
          </View>
        )}

        {item.role === 'staff' && (
          <View style={styles.detailGrid}>
            <View style={styles.detailChip}>
              <Text style={styles.detailChipLabel}>Department</Text>
              <Text style={styles.detailChipValue}>{item.department || 'N/A'}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroEyebrow}>Admin Dashboard</Text>
              <Text style={styles.title}>Manage People</Text>
              <Text style={styles.subtitle}>Add students and staff members</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons name="people-outline" size={26} color={COLORS.white} />
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroPill}>
              <Ionicons name="people-outline" size={14} color={COLORS.white} />
              <Text style={styles.heroPillText}>{peopleCount} records</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={openCreateModal} activeOpacity={0.9}>
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.addButtonText}>Add Person</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={18} color={COLORS.muted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search people by name, email, ID, or department"
              placeholderTextColor={COLORS.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchButton}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={18} color={COLORS.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.searchMetaRow}>
            <Text style={styles.searchMetaText}>
              {searchQuery ? 'Filtered people list' : 'Search the current roster'}
            </Text>
            <Text style={styles.searchMetaCount}>{filteredPeople.length} shown</Text>
          </View>
        </View>

        <FlatList
          data={filteredPeople}
          renderItem={renderPersonCard}
          keyExtractor={(item) => item.id}
          style={styles.peopleList}
          showsVerticalScrollIndicator
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="people-outline" size={48} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No matching people found' : 'No people added yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? 'Try a different keyword or clear the search.'
                  : 'Tap the + button to add a student or staff member'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Add Person Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>{isEditingPerson ? 'Edit record' : 'New record'}</Text>
                  <Text style={styles.modalTitle}>{isEditingPerson ? 'Update Person' : 'Add New Person'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <View style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={COLORS.dark} />
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.formContent}
              contentContainerStyle={styles.formContentInner}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              {/* User Type Selection */}
              <Text style={styles.sectionLabel}>User Type</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    userType === 'student' && styles.typeButtonActive,
                  ]}
                  onPress={() => {
                    setUserType('student');
                    setFormData({ ...formData, role: 'student' });
                  }}
                >
                  <Ionicons
                    name="school-outline"
                    size={20}
                    color={userType === 'student' ? COLORS.white : COLORS.muted}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      userType === 'student' && styles.typeButtonTextActive,
                    ]}
                  >
                    Student
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    userType === 'staff' && styles.typeButtonActive,
                  ]}
                  onPress={() => {
                    setUserType('staff');
                    setFormData({ ...formData, role: 'staff' });
                  }}
                >
                  <Ionicons
                    name="briefcase-outline"
                    size={20}
                    color={userType === 'staff' ? COLORS.white : COLORS.muted}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      userType === 'staff' && styles.typeButtonTextActive,
                    ]}
                  >
                    Staff
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Common Fields */}
              <Text style={styles.sectionLabel}>Basic Information</Text>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                placeholderTextColor={COLORS.muted}
              />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                keyboardType="email-address"
                placeholderTextColor={COLORS.muted}
                editable={!isEditingPerson}
                pointerEvents={isEditingPerson ? 'none' : 'auto'}
              />
              {isEditingPerson ? (
                <Text style={styles.helperText}>
                  Email is locked while editing to keep the account login in sync with Firebase Auth.
                </Text>
              ) : null}
              <TextInput
                style={styles.input}
                placeholder="Password (min 6 characters)"
                placeholderTextColor={COLORS.muted}
                value={formData.password}
                onChangeText={(text) =>
                  setFormData({ ...formData, password: text })
                }
                secureTextEntry={true}
                editable={!isEditingPerson}
                pointerEvents={isEditingPerson ? 'none' : 'auto'}
              />
              {isEditingPerson ? (
                <Text style={styles.helperText}>
                  Password changes are not supported in this form. Leave this field disabled while updating profile details.
                </Text>
              ) : null}

              {/* Student Fields */}
              {userType === 'student' && (
                <>
                  <Text style={styles.sectionLabel}>Academic Information</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Student ID"
                    value={formData.studentID}
                    onChangeText={(text) =>
                      setFormData({ ...formData, studentID: text })
                    }
                    placeholderTextColor={COLORS.muted}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Programme"
                    value={formData.programme}
                    onChangeText={(text) =>
                      setFormData({ ...formData, programme: text })
                    }
                    placeholderTextColor={COLORS.muted}
                  />
                  <Text style={styles.sectionLabel}>Level</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.level}
                      onValueChange={(value) =>
                        setFormData({ ...formData, level: value })
                      }
                      style={styles.picker}
                    >
                      <Picker.Item label="100" value="100" />
                      <Picker.Item label="200" value="200" />
                      <Picker.Item label="300" value="300" />
                      <Picker.Item label="400" value="400" />
                    </Picker>
                  </View>
                </>
              )}

              {/* Staff Fields */}
              {userType === 'staff' && (
                <>
                  <Text style={styles.sectionLabel}>Staff Information</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Department"
                    value={formData.department}
                    onChangeText={(text) =>
                      setFormData({ ...formData, department: text })
                    }
                    placeholderTextColor={COLORS.muted}
                  />
                </>
              )}

              <View style={styles.formButtons}>
                <CustomButton
                  title="Cancel"
                  onPress={() => setShowModal(false)}
                  variant="outline"
                  style={{ flex: 1 }}
                />
                <View style={{ width: 12 }} />
                <CustomButton
                  title={isEditingPerson ? 'Update Person' : 'Add Person'}
                  onPress={handleSavePerson}
                  variant="primary"
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 28,
    padding: 18,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: '#020617',
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 6,
    lineHeight: 20,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroPillText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  searchContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.dark,
    minWidth: 0,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchMetaText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
  },
  searchMetaCount: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: -4,
    marginBottom: 12,
    lineHeight: 18,
  },
  peopleList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  personCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  personTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  personIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  personInfo: {
    flex: 1,
    minWidth: 0,
  },
  personName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.dark,
    flexShrink: 1,
  },
  personRole: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
    fontWeight: '600',
    flexShrink: 1,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  personDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8EEF9',
  },
  detailRow: {
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: '600',
    flexShrink: 1,
    flexWrap: 'wrap',
    lineHeight: 20,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  detailChip: {
    flexBasis: '48%',
    minWidth: 0,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  detailChipLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  detailChipValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.dark,
    flexShrink: 1,
    flexWrap: 'wrap',
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 20,
    shadowColor: '#020617',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EEF9',
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.dark,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formContent: {
    paddingHorizontal: 18,
    flexGrow: 1,
  },
  formContentInner: {
    paddingTop: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeButtonActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.muted,
    marginLeft: 8,
  },
  typeButtonTextActive: {
    color: COLORS.white,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    fontSize: 14,
    color: COLORS.dark,
  },
  pickerContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  picker: {
    color: COLORS.dark,
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 12,
  },
});

export default ManagePeopleScreen;
